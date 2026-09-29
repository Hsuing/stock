
const fs = require("fs");
let content = fs.readFileSync("src/components/EtfShareDetail.tsx", "utf8");

content = content.replace(
	/<tr key=\{i\}>/g,
	`<tr key={i} className={row.change > 0 ? "row-up" : row.change < 0 ? "row-down" : ""}>`
);

fs.writeFileSync("src/components/EtfShareDetail.tsx", content);

