package httpapi

import (
	"context"
	"io"
	"net/http"
	"testing"
)

func TestSZSE(t *testing.T) {
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "http://www.szse.cn/api/report/ShowReport/data?SHOWTYPE=JSON&CATALOGID=1945_fund&TABKEY=tab1", nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	t.Logf("Response: %s", string(body)[:200])
}
