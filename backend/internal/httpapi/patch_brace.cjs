
const fs = require("fs");
let content = fs.readFileSync("etf_shares.go", "utf8");

content = content.replace(
	"shares[i].ChangePercent = (shares[i].ShareChange / prev.TotalShares) * 100\n\t\t\t}\n\t}",
	"shares[i].ChangePercent = (shares[i].ShareChange / prev.TotalShares) * 100\n\t\t\t}\n\t\t}\n\t}"
);

fs.writeFileSync("etf_shares.go", content);

