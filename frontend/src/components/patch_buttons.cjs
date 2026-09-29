
const fs = require("fs");
let content = fs.readFileSync("EtfShareRanking.tsx", "utf8");

// Split by className="control-right"
let parts = content.split(`<div className="control-right">`);
if (parts.length > 1) {
	// find where the next </div> is or just split the buttons
	// since the buttons are followed by "</div>\n\t\t\t</div>"
	
	const correctButtons = `
					<button className={\`quick-date-btn \${range === "1d" ? "active" : ""}\`} onClick={() => setRange("1d")}>近1天</button>
					<button className={\`quick-date-btn \${range === "1w" ? "active" : ""}\`} onClick={() => setRange("1w")}>近1周</button>
					<button className={\`quick-date-btn \${range === "1m" ? "active" : ""}\`} onClick={() => setRange("1m")}>近1个月</button>
					<button className={\`quick-date-btn \${range === "3m" ? "active" : ""}\`} onClick={() => setRange("3m")}>近3个月</button>
				</div>
			</div>
`;
	
	// Just replace everything from <div className="control-right"> to </div>\n\t\t\t</div>
	content = content.replace(/<div className="control-right">[\s\S]*?<\/div>[\s\S]*?<\/div>/, `<div className="control-right">\n` + correctButtons);
	fs.writeFileSync("EtfShareRanking.tsx", content);
}

