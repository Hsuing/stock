
const fs = require("fs");
let content = fs.readFileSync("EtfShareRanking.tsx", "utf8");

// Add total state
content = content.replace("const [dataDate, setDataDate] = useState<string>(\x27\x27);", "const [dataDate, setDataDate] = useState<string>(\x27\x27);\n\tconst [total, setTotal] = useState(0);");

// Update fetch to set total
content = content.replace("setDataDate(json.date || \x27\x27);", "setDataDate(json.date || \x27\x27);\n\t\t\t\t\tsetTotal(json.total || 0);");

fs.writeFileSync("EtfShareRanking.tsx", content);

