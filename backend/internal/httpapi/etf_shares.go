package httpapi

import (
	"io"
	"encoding/json"
		"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"easy-stock/backend/internal/foundation"
	"golang.org/x/text/encoding/simplifiedchinese"
)

type etfSharesResponse struct {
	Date  string                `json:"date"`
	Total int                   `json:"total"`
	Data  []foundation.ETFShare `json:"data"`
}



func (s *Server) handleETFShareRanking(w http.ResponseWriter, r *http.Request) {
	keyword := r.URL.Query().Get("keyword")
	sortBy := r.URL.Query().Get("sort_by")
	if sortBy == "" {
		sortBy = "change_percent"
	}
	order := r.URL.Query().Get("order")
	if order == "" {
		order = "desc"
	}

	tracked, err := s.etfStore.GetTrackedETFs()
	if err != nil || len(tracked) == 0 {
		writeError(w, http.StatusInternalServerError, "Failed to get tracked ETFs")
		return
	}
	
	url := "http://qt.gtimg.cn/q=" + strings.Join(tracked, ",")
	req, err := http.NewRequestWithContext(r.Context(), "GET", url, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	// Tencent API returns GBK encoded data
	decodedBody, err := simplifiedchinese.GB18030.NewDecoder().Bytes(body)
	if err == nil {
		body = decodedBody
	}

	
	var shares []foundation.ETFShare
	lines := strings.Split(string(body), ";")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Split(line, "~")
		if len(parts) < 46 {
			continue
		}
		name := parts[1]
		symbol := parts[2]
		price, _ := strconv.ParseFloat(parts[3], 64)
		marketCap, _ := strconv.ParseFloat(parts[45], 64)

		if price <= 0 || marketCap <= 0 {
			continue
		}

		totalShares := (marketCap * 10000) / price

		if keyword != "" && !strings.Contains(name, keyword) && !strings.Contains(symbol, keyword) {
			continue
		}

		shares = append(shares, foundation.ETFShare{
			Symbol:      symbol,
			Name:        name,
			TotalShares: totalShares,
			Price:       price,
			TradeDate:   time.Now().Format("2006-01-02"),
		})
	}

	// Save today's snapshot to SQLite
	today := time.Now().Format("2006-01-02")
	_ = s.etfStore.SaveSnapshot(today, shares)

	// Fetch previous date snapshot to calculate changes
	rangeParam := r.URL.Query().Get("range")
	offsetDays := 1
	switch rangeParam {
	case "1w":
		offsetDays = 7
	case "1m":
		offsetDays = 30
	case "3m":
		offsetDays = 90
	}
	
	var prevShares map[string]foundation.ETFShare
	prevShares, _ = s.etfStore.GetSharesByClosestDate(today, offsetDays)

	for i := range shares {
		if prevShares != nil {
			if prev, ok := prevShares[shares[i].Symbol]; ok && prev.TotalShares > 0 {
				shares[i].ShareChange = shares[i].TotalShares - prev.TotalShares
				shares[i].ChangePercent = (shares[i].ShareChange / prev.TotalShares) * 100
			}
		}
	}

	sort.SliceStable(shares, func(i, j int) bool {
		var less bool
		switch sortBy {
		case "change_percent":
			less = shares[i].ChangePercent < shares[j].ChangePercent
		case "share_change":
			less = shares[i].ShareChange < shares[j].ShareChange
		case "total_shares":
			less = shares[i].TotalShares < shares[j].TotalShares
		default:
			less = shares[i].ChangePercent < shares[j].ChangePercent
		}
		if order == "desc" {
			return !less
		}
		return less
	})

	writeJSON(w, http.StatusOK, etfSharesResponse{
		Date:  today,
		Total: len(shares),
		Data:  shares,
	})
}

func (s *Server) handleETFShareHistory(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	limitStr := r.URL.Query().Get("limit")
	limit := 180
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	history, err := s.etfStore.GetHistory(code, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Calculate changes for history (since it is ordered by date DESC)
	for i := 0; i < len(history)-1; i++ {
		prev := history[i+1]
		history[i].ShareChange = history[i].TotalShares - prev.TotalShares
		if prev.TotalShares > 0 {
			history[i].ChangePercent = (history[i].ShareChange / prev.TotalShares) * 100
		}
	}
	if len(history) > 0 {
		history[len(history)-1].ShareChange = 0
		history[len(history)-1].ChangePercent = 0
	}

	// Reverse to ascending order for frontend chart
	for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
		history[i], history[j] = history[j], history[i]
	}

	

	writeJSON(w, http.StatusOK, history)
}



func (s *Server) handleTrackETF(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	code := strings.TrimSpace(req.Code)
	if len(code) != 6 {
		writeError(w, http.StatusBadRequest, "ETF 代码必须是 6 位数字")
		return
	}

	// Probe Tencent API to see if it exists
	probeUrl := "http://qt.gtimg.cn/q=sh" + code + ",sz" + code
	resp, err := http.Get(probeUrl)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "探测失败")
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	
	respStr := string(body)
	var finalCode string
	if strings.Contains(respStr, "v_sh"+code+"=\"1~") {
		finalCode = "sh" + code
	} else if strings.Contains(respStr, "v_sz"+code+"=\"51~") || strings.Contains(respStr, "v_sz"+code+"=\"1~") {
		finalCode = "sz" + code
	} else {
		writeError(w, http.StatusNotFound, "找不到该 ETF 代码")
		return
	}

	// Add to database
	if err := s.etfStore.AddTrackedETF(finalCode); err != nil {
		writeError(w, http.StatusInternalServerError, "保存失败")
		return
	}

	// Auto backfill history in background
	go func() {
		// Just a simple backfill like in backfill_etf
		secid := "0." + code
		if strings.HasPrefix(finalCode, "sh") {
			secid = "1." + code
		}
		backfillUrl := "http://push2his.eastmoney.com/api/qt/stock/kline/get?secid=" + secid + "&fields1=f1&fields2=f51,f52&klt=101&fqt=1&end=20500101&lmt=365"
		
		emResp, err := http.Get(backfillUrl)
		if err != nil { return }
		defer emResp.Body.Close()
		emBody, _ := io.ReadAll(emResp.Body)
		
		var res struct {
			Data struct {
				Klines []string `json:"klines"`
			} `json:"data"`
		}
		json.Unmarshal(emBody, &res)
		
		
		for _, k := range res.Data.Klines {
			parts := strings.Split(k, ",")
			if len(parts) >= 2 {
				dateStr := parts[0]
				price, _ := strconv.ParseFloat(parts[1], 64)
				totalShares := 10000.0
				
				
				s.etfStore.SaveSnapshot(dateStr, []foundation.ETFShare{
					{
						Symbol: finalCode,
						Name: "未知", // It will be overwritten during sync anyway
						Price: price,
						TotalShares: totalShares,
						
					},
				})
			}
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"success": true, "code": "` + finalCode + `"}`))
}






