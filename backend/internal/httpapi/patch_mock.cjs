
const fs = require("fs");
let content = fs.readFileSync("etf_shares.go", "utf8");

const startMock = "// Since we only have today in the DB right now, we can pad it with mock data if limit > len(history) so UI still looks good today, but tomorrow it will be real.";
const endMock = "history = padded\n\t}";

const startIndex = content.indexOf(startMock);
const endIndex = content.indexOf(endMock) + endMock.length;

if (startIndex !== -1 && endIndex > startIndex) {
	content = content.substring(0, startIndex) + content.substring(endIndex);
	fs.writeFileSync("etf_shares.go", content);
	console.log("Mock logic removed");
} else {
	console.log("Could not find mock logic");
}

