import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChevronLeft, Calendar } from 'lucide-react';
import { BackendConfig } from '../lib/backend';
import './EtfShareRanking.css';

interface Props {
	config: BackendConfig | null;
	code: string;
	name: string;
	onBack: () => void;
}

export function EtfShareDetail({ config, code, name, onBack }: Props) {
	const [range, setRange] = useState<'1m' | '3m' | '6m' | '1y'>('6m');
	const [historyData, setHistoryData] = useState<any[]>([]);

	useEffect(() => {
		let active = true;
		const days = range === '1m' ? 30 : range === '3m' ? 90 : range === '6m' ? 180 : 365;
		const url = `${config?.backendUrl || ''}/api/v1/etf/shares/${code}/history?limit=${days}`;
		
		fetch(url, { headers: { 'Authorization': `Bearer ${config?.token}` } })
			.then(r => r.json())
			.then(data => {
				if (!active) return;
				// Map data to the format we need
				const mapped = (data || []).map((item: any) => ({
					date: item.trade_date,
					share: item.total_shares,
					price: item.price,
					change: item.share_change,
					changePercent: item.change_percent
				}));
				setHistoryData(mapped);
			})
			.catch(console.error);
			
		return () => { active = false; };
	}, [config, code, range]);

	const option = useMemo(() => {
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
				formatter: function (params: any) {
					if (!params.length) return "";
					const date = params[0].name;
					const shareItem = params.find((p: any) => p.seriesName === "基金份额");
					const priceItem = params.find((p: any) => p.seriesName === "收盘价");
					const changeItem = params.find((p: any) => p.seriesName === "份额增减");
					
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
					
					return `
						<div style="font-family: sans-serif; min-width: 180px; line-height: 1.8; font-size: 13px;">
							<div style="font-weight: bold; margin-bottom: 6px; font-size: 14px; color: #fff;">${date}</div>
							<div style="display: flex; align-items: center; color: #fff;">
								${shareItem ? shareItem.marker : "<span style=\"display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#409EFF;\"></span>"}
								<span style="color: #a0a0a0; margin-right: 8px;">基金份额:</span> ${shareStr}
							</div>
							<div style="display: flex; align-items: center; color: #fff;">
								${priceItem ? priceItem.marker : "<span style=\"display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#e6a23c;\"></span>"}
								<span style="color: #a0a0a0; margin-right: 8px;">收盘价:</span> ${priceStr}
							</div>
							<div style="display: flex; align-items: center; color: #fff;">
								<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${priceChangeColor};"></span>
								<span style="color: #a0a0a0; margin-right: 8px;">涨跌幅:</span> <span style="color: ${priceChangeColor}">${priceChangePct}</span>
							</div>
							<div style="display: flex; align-items: center; color: #fff;">
								${changeItem ? changeItem.marker : "<span style=\"display:inline-block;margin-right:4px;border-radius:2px;width:10px;height:10px;background-color:#f56c6c;\"></span>"}
								<span style="color: #a0a0a0; margin-right: 8px;">份额增减:</span> ${changeStr}
							</div>
							<div style="color: ${changeColor}; font-size: 12px; margin-top: 2px;">
								<span style="color: #a0a0a0; margin-right: 8px;">增减幅度:</span> ${shareChangePct}
							</div>
						</div>
					`;
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
						color: (params: any) => {
							return parseFloat(params.value) >= 0 ? "#f56c6c" : "#67c23a";
						}
					}
				}
			]
		};
	}, [historyData]);

	const startDate = historyData.length > 0 ? historyData[0].date : '';
	const endDate = historyData.length > 0 ? historyData[historyData.length - 1].date : '';

	// table reverse data
	const tableData = [...historyData].reverse();

	return (
		<div className="etf-ranking-workspace etf-detail-workspace">
			<div className="etf-header">
				<button className="back-btn" onClick={onBack}>
					<ChevronLeft size={16} /> 返回
				</button>
				<h2>{name} ({code})</h2>
				<span className="subtitle">基金份额历史明细</span>
			</div>
			
			<div className="etf-controls detail-controls">
				<div className="control-group">
					<span className="label">时间范围:</span>
					<div className="date-picker-mock">
						<Calendar size={14} /> {startDate} ~ {endDate}
					</div>
					<div className="range-presets">
						<button className={range === '1m' ? 'active' : ''} onClick={() => setRange('1m')}>近1个月</button>
						<button className={range === '3m' ? 'active' : ''} onClick={() => setRange('3m')}>近3个月</button>
						<button className={range === '6m' ? 'active' : ''} onClick={() => setRange('6m')}>近半年</button>
						<button className={range === '1y' ? 'active' : ''} onClick={() => setRange('1y')}>近1年</button>
					</div>
				</div>
			</div>

			<div className="detail-info-bar">
				数据区间: {startDate} ~ {endDate} &nbsp;&nbsp;&nbsp; 共 {historyData.length} 个交易日
			</div>

			<div className="etf-content detail-content">
				<div className="chart-container">
					<ReactECharts option={option} style={{ height: '500px', width: '100%' }} />
				</div>

				<div className="detail-table-container">
					<div className="table-split">
						<table className="etf-table">
							<thead>
								<tr>
									<th>日期</th>
									<th className="align-right">基金份额</th>
									<th className="align-right">份额增减</th>
									<th className="align-right">增减%</th>
								</tr>
							</thead>
							<tbody>
								{tableData.slice(0, Math.ceil(tableData.length / 2)).map((row, i) => (
									<tr key={i} className={row.change > 0 ? "row-up" : row.change < 0 ? "row-down" : ""}>
										<td>{row.date}</td>
										<td className="align-right">{row.share >= 10000 ? (row.share / 10000).toFixed(2) + ` 亿份` : row.share.toFixed(2) + ` 万份`}</td>
										<td className={`align-right ${row.change > 0 ? 'text-up' : row.change < 0 ? 'text-down' : ''}`}>
											{row.change > 0 ? `+` : ``}{Math.abs(row.change) >= 10000 ? (row.change / 10000).toFixed(2) + ` 亿份` : row.change.toFixed(2) + ` 万份`}
										</td>
										<td className={`align-right ${row.changePercent > 0 ? 'text-up' : row.changePercent < 0 ? 'text-down' : ''}`}>
											{row.changePercent > 0 ? '+' : ''}{row.changePercent.toFixed(2)}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<table className="etf-table">
							<thead>
								<tr>
									<th>日期</th>
									<th className="align-right">基金份额</th>
									<th className="align-right">份额增减</th>
									<th className="align-right">增减%</th>
								</tr>
							</thead>
							<tbody>
								{tableData.slice(Math.ceil(tableData.length / 2)).map((row, i) => (
									<tr key={i} className={row.change > 0 ? "row-up" : row.change < 0 ? "row-down" : ""}>
										<td>{row.date}</td>
										<td className="align-right">{row.share >= 10000 ? (row.share / 10000).toFixed(2) + ` 亿份` : row.share.toFixed(2) + ` 万份`}</td>
										<td className={`align-right ${row.change > 0 ? 'text-up' : row.change < 0 ? 'text-down' : ''}`}>
											{row.change > 0 ? `+` : ``}{Math.abs(row.change) >= 10000 ? (row.change / 10000).toFixed(2) + ` 亿份` : row.change.toFixed(2) + ` 万份`}
										</td>
										<td className={`align-right ${row.changePercent > 0 ? 'text-up' : row.changePercent < 0 ? 'text-down' : ''}`}>
											{row.changePercent > 0 ? '+' : ''}{row.changePercent.toFixed(2)}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}


