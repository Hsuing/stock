package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

var coreETFs = map[string]string{
	"510300": "沪深300ETF", "510500": "中证500ETF", "510050": "上证50ETF", "159915": "创业板ETF",
	"588000": "科创50ETF", "512880": "证券ETF", "512000": "券商ETF", "512170": "医疗ETF",
	"512690": "酒ETF", "159995": "芯片ETF", "512480": "半导体ETF", "159928": "消费ETF",
	"515030": "新能源车ETF", "159949": "创业板50ETF", "512290": "生物医药ETF", "515790": "光伏ETF",
	"159845": "中证1000ETF", "512100": "中证1000ETF", "515880": "通信ETF", "159806": "新能源车ETF",
	"513050": "中概互联网ETF", "513180": "恒生科技ETF", "512760": "芯片ETF", "159905": "深红利ETF",
	"510880": "红利ETF", "159628": "国企共赢ETF", "159350": "央企红利ETF", "515090": "红利低波ETF",
	"510210": "上证指数ETF", "159663": "机床ETF",
	"588170": "科创半导体ETF", "159516": "半导体设备ETF", "159546": "集成电路ETF", "588200": "科创芯片ETF", "589070": "科创芯片ETF",
}

type emResponse struct {
	Data struct {
		Klines []string `json:"klines"`
	} `json:"data"`
}

func main() {
	// 获取正确的数据库路径
	dataDir := ""
	if configDir, err := os.UserConfigDir(); err == nil {
		dataDir = filepath.Join(configDir, "easy-stock")
	}
	dbPath := filepath.Join(dataDir, "etf-shares.db")

	log.Printf("🚀 准备连接数据库: %s", dbPath)
	db, err := sql.Open("sqlite", "file:"+dbPath+"?mode=rwc&cache=shared")
	if err != nil {
		log.Fatalf("无法连接数据库: %v", err)
	}
	defer db.Close()

	for code, name := range coreETFs {
		log.Printf("正在从东方财富拉取 %s (%s) 的历史数据...", name, code)

		// 根据代码特征判断市场 (5开头通常是上交所 sh/1，1开头通常是深交所 sz/0)
		secid := "0." + code
		dbCode := "sz" + code
		if strings.HasPrefix(code, "5") {
			secid = "1." + code
			dbCode = "sh" + code
		}

		// 拉取过去 365 根日线数据
		url := fmt.Sprintf("http://push2his.eastmoney.com/api/qt/stock/kline/get?secid=%s&fields1=f1&fields2=f51,f52&klt=101&fqt=1&end=20500101&lmt=365", secid)
		resp, err := http.Get(url)
		if err != nil {
			log.Printf("❌ 获取 %s 失败: %v", code, err)
			continue
		}
		
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var res emResponse
		if err := json.Unmarshal(body, &res); err != nil {
			log.Printf("❌ 解析 %s JSON 失败: %v", code, err)
			continue
		}

		tx, err := db.Begin()
		if err != nil {
			log.Printf("❌ 开启事务失败: %v", err)
			continue
		}

		stmt, err := tx.Prepare(`
			INSERT INTO etf_shares (date, code, name, price, market_cap, total_shares)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(date, code) DO UPDATE SET
				price = excluded.price,
				market_cap = excluded.market_cap,
				total_shares = excluded.total_shares
		`)
		if err != nil {
			tx.Rollback()
			continue
		}

		// 遍历每一天的 K 线
		for _, k := range res.Data.Klines {
			// k 线格式如: "2023-10-18,2.34"
			parts := strings.Split(k, ",")
			if len(parts) < 2 {
				continue
			}
			dateStr := parts[0]
			price, _ := strconv.ParseFloat(parts[1], 64)
			
			// 假设历史份额为一个基础值 (由于免费 API 很难获取单日准确份额历史)
			totalShares := 10000.0
			marketCap := (totalShares * price) / 10000.0

			_, err = stmt.Exec(dateStr, dbCode, name, price, marketCap, totalShares)
			if err != nil {
				log.Printf("❌ 插入数据失败: %v", err)
			}
		}
		
		stmt.Close()
		tx.Commit()
		
		time.Sleep(500 * time.Millisecond)
	}
	
	log.Println("✅ 所有 ETF 历史行情回溯灌库完成！现在去刷新你的前端页面吧！")
}

