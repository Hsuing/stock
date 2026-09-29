package eastmoney

import (
	"context"
	"time"

	"easy-stock/backend/internal/foundation"
)

// FetchETFShareRanking fetches ETF share ranking from Eastmoney.
// Note: This requires the specific RPT_ reportName from Eastmoney DataCenter.
func (c *Client) FetchETFShareRanking(ctx context.Context, date time.Time) ([]foundation.ETFShare, error) {
	// TODO: Replace with actual Eastmoney API endpoint when known.
	return []foundation.ETFShare{
		{
			Symbol:        "512970",
			Name:          "大湾区ETF平安",
			TotalShares:   69876.0,
			ShareChange:   100.0,
			ChangePercent: 16.70,
			TradeDate:     date.Format("2006-01-02"),
		},
		{
			Symbol:        "159628",
			Name:          "国证2000ETF万家",
			TotalShares:   39200.0,
			ShareChange:   4200.0,
			ChangePercent: 11.99,
			TradeDate:     date.Format("2006-01-02"),
		},
	}, nil
}
