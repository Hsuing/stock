
const fs = require("fs");
const file = "EtfShareDetail.tsx";
let content = fs.readFileSync(file, "utf8");

// We just replace the tooltip object
const newTooltip = `tooltip: {
				trigger: "axis",
				axisPointer: { type: "cross" },
				backgroundColor: "rgba(30, 34, 45, 0.9)",
				borderColor: "#444",
				textStyle: { color: "#fff" },
				formatter: function (params) {
					if (!params.length) return "";
					const date = params[0].name;
					const shareItem = params.find(p => p.seriesName === "基金份额");
					const priceItem = params.find(p => p.seriesName === "收盘价");
					const changeItem = params.find(p => p.seriesName === "份额增减");
					
					let shareStr = "--";
					if (shareItem) {
						const v = parseFloat(shareItem.value);
						if (v >= 10000) shareStr = (v / 10000).toFixed(2) + " 亿份";
						else shareStr = v.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " 万份";
					}

					let priceStr = priceItem ? parseFloat(priceItem.value).toFixed(3) + " 元" : "--";
					
					let changeStr = "--";
					let changeColor = "#a0a0a0";
					if (changeItem) {
						const v = parseFloat(changeItem.value);
						const formattedV = v >= 10000 || v <= -10000 ? (v / 10000).toFixed(2) + " 亿份" : Math.abs(v).toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " 万份";
						const sign = v > 0 ? "+" : (v < 0 ? "-" : "");
						changeStr = sign + formattedV;
						changeColor = v > 0 ? "#f56c6c" : (v < 0 ? "#67c23a" : "#a0a0a0");
					}

					const dataIdx = params[0].dataIndex;
					// Since we are inside the component closure, historyData is not directly available to ECharts formatter unless we pass it, but ECharts formatter is a string or function.
					// Actually we can just get changePercent from data! 
					// Wait, the historyData is in scope because the formatter is an arrow function or defined inside useMemo!
					const currentData = historyData[dataIdx];
					
					let priceChangePct = "--";
					let priceChangeColor = "#a0a0a0";
					if (dataIdx > 0) {
						const prevPrice = historyData[dataIdx - 1].price;
						if (prevPrice > 0) {
							const pct = ((currentData.price - prevPrice) / prevPrice) * 100;
							const sign = pct > 0 ? "+" : "";
							priceChangePct = sign + pct.toFixed(2) + "%";
							priceChangeColor = pct > 0 ? "#f56c6c" : (pct < 0 ? "#67c23a" : "#a0a0a0");
						}
					}
					
					let shareChangePct = "--";
					if (currentData) {
						const sign = currentData.changePercent > 0 ? "+" : "";
						shareChangePct = sign + currentData.changePercent.toFixed(2) + "%";
					}
					
					return \`
						<div style="font-family: sans-serif; min-width: 180px; line-height: 1.8; font-size: 13px;">
							<div style="font-weight: bold; margin-bottom: 6px; font-size: 14px; color: #fff;">\${date}</div>
							<div style="display: flex; align-items: center; color: #fff;">
								\${shareItem ? shareItem.marker : "<span style=\\"display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#409EFF;\\"></span>"}
								<span style="color: #a0a0a0; margin-right: 8px;">基金份额:</span> \${shareStr}
							</div>
							<div style="display: flex; align-items: center; color: #fff;">
								\${priceItem ? priceItem.marker : "<span style=\\"display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#e6a23c;\\"></span>"}
								<span style="color: #a0a0a0; margin-right: 8px;">收盘价:</span> \${priceStr}
							</div>
							<div style="display: flex; align-items: center; color: #fff;">
								<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:\${priceChangeColor};"></span>
								<span style="color: #a0a0a0; margin-right: 8px;">涨跌幅:</span> <span style="color: \${priceChangeColor}">\${priceChangePct}</span>
							</div>
							<div style="display: flex; align-items: center; color: #fff;">
								\${changeItem ? changeItem.marker : "<span style=\\"display:inline-block;margin-right:4px;border-radius:2px;width:10px;height:10px;background-color:#f56c6c;\\"></span>"}
								<span style="color: #a0a0a0; margin-right: 8px;">份额增减:</span> \${changeStr}
							</div>
							<div style="color: \${changeColor}; font-size: 12px; margin-top: 2px;">
								<span style="color: #a0a0a0; margin-right: 8px;">增减幅度:</span> \${shareChangePct}
							</div>
						</div>
					\`;
				}
			},`;

content = content.replace(/tooltip:\s*\{[\s\S]*?\},/, newTooltip);
fs.writeFileSync(file, content);
console.log("Done");

