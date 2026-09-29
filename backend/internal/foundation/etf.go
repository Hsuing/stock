package foundation



// ETFShare represents the share data of an ETF for a specific date.
type ETFShare struct {
	Symbol        string    `json:"symbol"`
	Name          string    `json:"name"`
	TotalShares   float64   `json:"total_shares"` // 基金份额 (万份)
	Price         float64   `json:"price"`        // 价格
	ShareChange   float64   `json:"share_change"` // 份额增减 (万份)
	ChangePercent float64   `json:"change_percent"` // 增减百分比
	TradeDate     string    `json:"trade_date"`
	Meta          SourceMeta `json:"meta"`
}

// ETFShareRankingParams holds the parameters for querying ETF share rankings.
type ETFShareRankingParams struct {
	Keyword   string
	StartDate string
	EndDate   string
	SortBy    string // "change_percent", "share_change", "total_shares"
	Order     string // "desc", "asc"
}
