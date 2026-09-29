
const fs = require("fs");
let content = fs.readFileSync("EtfShareDetail.tsx", "utf8");

content = content.replace("formatter: function (params) {", "formatter: function (params: any) {");
content = content.replace("params.find(p => p.seriesName === `"基金份额`")", "params.find((p: any) => p.seriesName === `"基金份额`")");
content = content.replace("params.find(p => p.seriesName === `"收盘价`")", "params.find((p: any) => p.seriesName === `"收盘价`")");
content = content.replace("params.find(p => p.seriesName === `"份额增减`")", "params.find((p: any) => p.seriesName === `"份额增减`")");
content = content.replace("color: (params) => {", "color: (params: any) => {");

// Also add startDate back since I removed it by mistake
content = content.replace("const endDate = historyData.length > 0 ?", "const startDate = historyData.length > 0 ? historyData[0].date : \"\";\n\tconst endDate = historyData.length > 0 ?");

fs.writeFileSync("EtfShareDetail.tsx", content);

