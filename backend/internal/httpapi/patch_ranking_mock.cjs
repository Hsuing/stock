
const fs = require("fs");
let content = fs.readFileSync("etf_shares.go", "utf8");

content = content.replace(/\s*\} else \{\s*\/\/ fallback mock for the very first day so UI doesn[\s\S]*?shares\[i\]\.ChangePercent = .*?\s*\}/, "");

fs.writeFileSync("etf_shares.go", content);

