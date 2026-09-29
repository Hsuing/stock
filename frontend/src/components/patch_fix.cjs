
const fs = require("fs");
let content = fs.readFileSync("EtfShareRanking.tsx", "utf8");

content = content.replace(
	"const formatted = (json.data || []).map",
	"setDataDate(json.date || \"\");\n\t\t\t\t\tsetTotal(json.total || 0);\n\t\t\t\t\tconst formatted = (json.data || []).map"
);

fs.writeFileSync("EtfShareRanking.tsx", content);

