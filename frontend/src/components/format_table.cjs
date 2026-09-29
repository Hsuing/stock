
const fs = require("fs");
let content = fs.readFileSync("EtfShareDetail.tsx", "utf8");

// We need to replace {row.share.toFixed(2)}万份 with a function call or inline logic
content = content.replace(
	/\{row\.share\.toFixed\(2\)\}(万份|)/g,
	"{row.share >= 10000 ? (row.share / 10000).toFixed(2) + ` 亿份` : row.share.toFixed(2) + ` 万份`}"
);

// We need to replace {row.change.toFixed(2)}万份 with logic as well
// {row.change > 0 ? "+" : ""}{row.change.toFixed(2)}万份
content = content.replace(
	/\{row\.change > 0 \? \x27\+\x27 : \x27\x27\}\{row\.change\.toFixed\(2\)\}(万份|)/g,
	"{row.change > 0 ? `+` : ``}{Math.abs(row.change) >= 10000 ? (row.change / 10000).toFixed(2) + ` 亿份` : row.change.toFixed(2) + ` 万份`}"
);

fs.writeFileSync("EtfShareDetail.tsx", content);

