
const fs = require("fs");
let content = fs.readFileSync("etf_shares.go", "utf8");

// Remove coreETFs declaration
content = content.replace(/var coreETFs = \[\]string\{[\s\S]*?\}/, "");

// Replace strings.Join(coreETFs, ",") with dynamic fetching
const fetchLogic = `tracked, err := s.etfStore.GetTrackedETFs()
	if err != nil || len(tracked) == 0 {
		writeError(w, http.StatusInternalServerError, "Failed to get tracked ETFs")
		return
	}
	
	url := "http://qt.gtimg.cn/q=" + strings.Join(tracked, ",")`;
	
content = content.replace(`url := "http://qt.gtimg.cn/q=" + strings.Join(coreETFs, ",")`, fetchLogic);

fs.writeFileSync("etf_shares.go", content);

