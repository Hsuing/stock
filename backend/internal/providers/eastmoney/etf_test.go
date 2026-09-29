package eastmoney

import (
	"context"
	"testing"
)

func TestFindETFAPI(t *testing.T) {
	client := NewClient()
	reports := []string{"RPT_MUTUAL_FUND_SCALE", "RPT_FUND_SCALE", "RPT_ETF_FUND_INFO", "RPT_FUND_INFO", "RPT_FUND_NET"}
	for _, r := range reports {
		var payload map[string]any
		err := client.getJSON(context.Background(), "https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=END_DATE,FUNDCODE&sortTypes=-1,1&pageSize=1&pageNumber=1&reportName="+r+"&columns=ALL", &payload)
		if err == nil {
			t.Logf("%s: %v", r, payload)
		}
	}
}
