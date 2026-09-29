
const fs = require("fs");
let content = fs.readFileSync("EtfShareDetail.tsx", "utf8");

// The good part starts before "const option = useMemo"
const parts = content.split("const option = useMemo(() => {");
const pre = parts[0];

// The good part ends at "const endDate = historyData.length > 0 ?"
const endParts = content.split("const endDate = historyData.length > 0");
const post = "const endDate = historyData.length > 0" + endParts[1];

const optionBlock = `const option = useMemo(() => {
		const dates = historyData.map(d => d.date);
		const shares = historyData.map(d => d.share.toFixed(2));
		const prices = historyData.map(d => d.price.toFixed(3));
		const changes = historyData.map(d => d.change.toFixed(2));

		return {
			backgroundColor: "transparent",
			tooltip: {
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
			},
			legend: {
				data: ["基金份额", "收盘价", "份额增减"],
				textStyle: { color: "#a0a0a0" },
				top: 0
			},
			grid: [
				{ left: "5%", right: "5%", top: "10%", height: "55%" },
				{ left: "5%", right: "5%", top: "75%", height: "20%" }
			],
			axisPointer: { link: [{ xAxisIndex: "all" }] },
			xAxis: [
				{
					type: "category",
					data: dates,
					gridIndex: 0,
					axisLine: { lineStyle: { color: "#444" } },
					axisLabel: { show: false }
				},
				{
					type: "category",
					data: dates,
					gridIndex: 1,
					axisLine: { lineStyle: { color: "#444" } },
					axisLabel: { color: "#a0a0a0" }
				}
			],
			yAxis: [
				{
					type: "value",
					name: "基金份额 (万份)",
					gridIndex: 0,
					nameTextStyle: { color: "#a0a0a0", align: "left" },
					splitLine: { lineStyle: { color: "#333" } },
					axisLabel: { color: "#a0a0a0" },
					scale: true
				},
				{
					type: "value",
					name: "收盘价 (元)",
					gridIndex: 0,
					nameTextStyle: { color: "#a0a0a0", align: "right" },
					splitLine: { show: false },
					axisLabel: { color: "#e6a23c" },
					scale: true
				},
				{
					type: "value",
					name: "份额增减 (万份)",
					gridIndex: 1,
					nameTextStyle: { color: "#a0a0a0", align: "left" },
					splitLine: { show: false },
					axisLabel: { color: "#a0a0a0" }
				}
			],
			series: [
				{
					name: "基金份额",
					type: "line",
					step: "end",
					data: shares,
					itemStyle: { color: "#409EFF" },
					showSymbol: false
				},
				{
					name: "收盘价",
					type: "line",
					data: prices,
					yAxisIndex: 1,
					itemStyle: { color: "#e6a23c" },
					smooth: true,
					showSymbol: false
				},
				{
					name: "份额增减",
					type: "bar",
					data: changes,
					xAxisIndex: 1,
					yAxisIndex: 2,
					itemStyle: {
						color: (params) => {
							return parseFloat(params.value) >= 0 ? "#f56c6c" : "#67c23a";
						}
					}
				}
			]
		};
	}, [historyData]);

	`;

fs.writeFileSync("EtfShareDetail.tsx", pre + optionBlock + post);
console.log("Rewrite done");

