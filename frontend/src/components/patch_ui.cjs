
const fs = require("fs");
let content = fs.readFileSync("EtfShareRanking.tsx", "utf8");
content = content.replace("const [loading, setLoading] = useState(false);", "const [loading, setLoading] = useState(false);\n\tconst [addCode, setAddCode] = useState(\"\");\n\tconst [adding, setAdding] = useState(false);");
fs.writeFileSync("EtfShareRanking.tsx", content);

