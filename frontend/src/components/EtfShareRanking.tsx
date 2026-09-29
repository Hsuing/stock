import { useState, useEffect } from 'react';
import { Search, LoaderCircle, Server, Calendar, ArrowDownAz, ArrowUpZa } from 'lucide-react';
import { BackendConfig } from '../lib/backend';
import './EtfShareRanking.css';

interface EtfShareRankingProps {
	config: BackendConfig | null;
	onRowClick?: (code: string, name: string) => void;
}

interface EtfRow {
	rank: number;
	code: string;
	name: string;
	total_shares: string;
	share_change: string;
	change_percent: number;
}

export function EtfShareRanking({ config, onRowClick }: EtfShareRankingProps) {
	const [keyword, setKeyword] = useState('');
	const [sortBy, setSortBy] = useState('change_percent');
	const [order, setOrder] = useState<'desc' | 'asc'>('desc');
	const [range, setRange] = useState<'1d'|'1w'|'1m'|'3m'>('1d');
	const [dataDate, setDataDate] = useState<string>('');
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [addCode, setAddCode] = useState("");
	const [adding, setAdding] = useState(false);
	const [data, setData] = useState<EtfRow[]>([]);

	
	const handleAddETF = async () => {
		if (addCode.length !== 6) {
			alert("请输入 6 位 ETF 代码");
			return;
		}
		setAdding(true);
		try {
			const res = await fetch(`${config?.backendUrl || ""}/api/v1/etf/track`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code: addCode })
			});
			if (!res.ok) {
				const err = await res.json();
				alert("添加失败: " + err.error);
			} else {
				alert("添加成功并已开始回溯数据！请等待约 15 秒后查看详情图表。");
				setAddCode("");
				// Trigger re-fetch by toggling sort or just re-calling fetchETF, but since it is in useEffect, we can just trigger a state change.
				// Let us just add a refresh counter state or re-call fetchETF, but wait fetchETF is inside useEffect.
				// For simplicity, just reload window.
				window.location.reload();
			}
		} catch (e) {
			alert("添加出错");
		} finally {
			setAdding(false);
		}
	};

	useEffect(() => {
		let active = true;
		setLoading(true);
		
		const fetchETF = async () => {
			try {
				const query = new URLSearchParams();
				if (keyword) query.set('keyword', keyword);
				query.set('sort_by', sortBy);
				query.set('order', order);
				query.set('range', range);
				query.set('range', range);
				
				const url = config?.backendUrl 
					? `${config.backendUrl}/api/v1/etf/shares?${query.toString()}` 
					: `/api/v1/etf/shares?${query.toString()}`;
					
				const res = await fetch(url);
				if (!res.ok) throw new Error('failed to fetch');
				const json = await res.json();
				if (active) {
					setDataDate(json.date || "");
					setTotal(json.total || 0);
					const formatted = (json.data || []).map((item: any, index: number) => ({
						rank: index + 1,
						code: item.symbol,
						name: item.name,
						total_shares: item.total_shares >= 10000 
							? `${(item.total_shares / 10000).toFixed(2)}亿份` 
							: `${item.total_shares.toFixed(2)}万份`,
						share_change: item.share_change >= 10000 || item.share_change <= -10000 
							? `${(item.share_change / 10000).toFixed(2)}亿份` 
							: `${item.share_change.toFixed(2)}万份`,
						change_percent: item.change_percent
					}));
					setData(formatted);
					setLoading(false);
				}
			} catch (err) {
				console.error(err);
				if (active) {
					setLoading(false);
				}
			}
		};

		fetchETF();
		return () => { active = false; };
	}, [config, keyword, sortBy, order, range]);

	return (
		<div className="etf-ranking-workspace">
			<header className="etf-hero">
				<h2>ETF份额排行</h2>
				<div className="etf-notice">
					<span className="notice-icon">💡</span>
					交易日每日，每刷新下，自动更新完成 ETF 份额数据
				</div>
			</header>

			<div className="etf-controls">
				<div className="control-left">
					<label className="etf-search">
						<input 
							value={keyword} 
							onChange={(e) => setKeyword(e.target.value)} 
							placeholder="搜索ETF代码或名称..." 
						/>
					</label>
					
					<div className="etf-date-range">
						<span>时间范围：</span>
						<div className="date-picker-mock">
							<Calendar size={14} /> 开始日期 ~ 结束日期
						</div>
					</div>

					<div className="etf-sort">
						<span>排序依据：</span>
						<select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
							<option value="change_percent">份额增减%</option>
							<option value="share_change">份额增减</option>
							<option value="total_shares">基金份额</option>
						</select>
						<button 
							className="sort-order-btn" 
							onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
						>
							{order === 'desc' ? <ArrowDownAz size={14} /> : <ArrowUpZa size={14} />}
							{order === 'desc' ? '降序' : '升序'}
						</button>
					</div>
				</div>

				
				<div style={{display: "flex", gap: "8px", marginRight: "auto", marginLeft: "16px"}}>
					<input 
						type="text" 
						placeholder="输入6位代码..." 
						value={addCode}
						onChange={e => setAddCode(e.target.value)}
						style={{padding: "4px 8px", borderRadius: "4px", border: "1px solid #444", background: "#1e222d", color: "#fff", width: "120px"}}
						maxLength={6}
					/>
					<button 
						onClick={handleAddETF} 
						disabled={adding}
						style={{background: "#2e7b5b", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer"}}
					>
						{adding ? "添加中..." : "➕ 添加 ETF"}
					</button>
				</div>
				<div className="control-right">

					<button className={`quick-date-btn ${range === "1d" ? "active" : ""}`} onClick={() => setRange("1d")}>近1天</button>
					<button className={`quick-date-btn ${range === "1w" ? "active" : ""}`} onClick={() => setRange("1w")}>近1周</button>
					<button className={`quick-date-btn ${range === "1m" ? "active" : ""}`} onClick={() => setRange("1m")}>近1个月</button>
					<button className={`quick-date-btn ${range === "3m" ? "active" : ""}`} onClick={() => setRange("3m")}>近3个月</button>
				</div>
			</div>


			<div className="etf-data-summary">
				<span>数据日期: {dataDate}</span>
				<span>共 {total} 只ETF</span>
			</div>

			<div className="etf-grid-container">
				{loading ? (
					<div className="etf-loading">
						<LoaderCircle className="spin" size={24} />
						<span>加载数据中...</span>
					</div>
				) : (
					<div className="etf-table-wrapper">
						<table className="etf-table">
							<thead>
								<tr>
									<th>排名</th>
									<th>ETF代码</th>
									<th>ETF名称</th>
									<th className="align-right">基金份额</th>
									<th className="align-right">份额增减</th>
									<th className="align-right">增减%</th>
									<th className="align-center">操作</th>
								</tr>
							</thead>
							<tbody>
								{data.slice(0, Math.ceil(data.length / 2)).map((row) => (
									<tr key={row.code} onClick={() => onRowClick && onRowClick(row.code, row.name)} className="clickable-row">
										<td>
											<span className={`rank-badge rank-${row.rank}`}>
												{row.rank}
											</span>
										</td>
										<td>{row.code}</td>
										<td>{row.name}</td>
										<td className="align-right">{row.total_shares}</td>
										<td className={`align-right ${row.change_percent > 0 ? 'text-up' : row.change_percent < 0 ? 'text-down' : ''}`}>
											{row.change_percent > 0 ? '+' : ''}{row.share_change}
										</td>
										<td className={`align-right ${row.change_percent > 0 ? 'text-up' : row.change_percent < 0 ? 'text-down' : ''}`}>
											{row.change_percent > 0 ? '+' : ''}{row.change_percent.toFixed(2)}%
										</td>
										<td className="align-center">
											<button className="view-btn" onClick={(e) => { e.stopPropagation(); onRowClick && onRowClick(row.code, row.name); }}>查看</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<table className="etf-table">
							<thead>
								<tr>
									<th>排名</th>
									<th>ETF代码</th>
									<th>ETF名称</th>
									<th className="align-right">基金份额</th>
									<th className="align-right">份额增减</th>
									<th className="align-right">增减%</th>
									<th className="align-center">操作</th>
								</tr>
							</thead>
							<tbody>
								{data.slice(Math.ceil(data.length / 2)).map((row) => (
									<tr key={row.code} onClick={() => onRowClick && onRowClick(row.code, row.name)} className="clickable-row">
										<td>
											<span className={`rank-badge rank-${row.rank}`}>
												{row.rank}
											</span>
										</td>
										<td>{row.code}</td>
										<td>{row.name}</td>
										<td className="align-right">{row.total_shares}</td>
										<td className={`align-right ${row.change_percent > 0 ? 'text-up' : row.change_percent < 0 ? 'text-down' : ''}`}>
											{row.change_percent > 0 ? '+' : ''}{row.share_change}
										</td>
										<td className={`align-right ${row.change_percent > 0 ? 'text-up' : row.change_percent < 0 ? 'text-down' : ''}`}>
											{row.change_percent > 0 ? '+' : ''}{row.change_percent.toFixed(2)}%
										</td>
										<td className="align-center">
											<button className="view-btn" onClick={(e) => { e.stopPropagation(); onRowClick && onRowClick(row.code, row.name); }}>查看</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}




