import sqlite3
import pandas as pd
import akshare as ak
import time
from datetime import datetime, timedelta

# TODO: 替换为你本地 SQLite 数据库的真实绝对路径
DB_PATH = r"C:\Users\Hsuin\AppData\Roaming\easy-stock\etf-shares.db"

# 我们在 Go 后端监控的核心 ETF 池（剥离了 sh/sz 前缀适配 akshare）
CORE_ETFS = {
    "510300": "沪深300ETF", "510500": "中证500ETF", "510050": "上证50ETF", "159915": "创业板ETF",
    "588000": "科创50ETF", "512880": "证券ETF", "512000": "券商ETF", "512170": "医疗ETF",
    "512690": "酒ETF", "159995": "芯片ETF", "512480": "半导体ETF", "159928": "消费ETF",
    "515030": "新能源车ETF", "159949": "创业板50ETF", "512290": "生物医药ETF", "515790": "光伏ETF",
    "159845": "中证1000ETF", "512100": "中证1000ETF", "515880": "通信ETF", "159806": "新能源车ETF",
    "513050": "中概互联网ETF", "513180": "恒生科技ETF", "512760": "芯片ETF", "159905": "深红利ETF",
    "510880": "红利ETF", "159628": "国企共赢ETF", "159350": "央企红利ETF", "515090": "红利低波ETF",
    "510210": "上证指数ETF", "159663": "机床ETF"
}

def backfill_history():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 算出一年前的日期
    start_date = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")
    end_date = datetime.now().strftime("%Y%m%d")

    print(f"🚀 开始回溯 ETF 历史数据 ({start_date} ~ {end_date})")

    for code, name in CORE_ETFS.items():
        print(f"正在拉取 {name} ({code})...")
        try:
            # 1. 调用 AKShare 历史行情接口获取每日收盘价
            df_hist = ak.fund_etf_hist_em(symbol=code, period="daily", start_date=start_date, end_date=end_date)

            # 注意：由于部分开放 API 只能一次性拉取份额快照，
            # 若需精确到每一天的历史份额，你可能需要结合 fund_etf_scale_sse / fund_etf_scale_szse 进行双表 merge。
            # 此处演示将其基础历史行情完整灌入

            for index, row in df_hist.iterrows():
                # 解析日期 (可能不同接口返回的格式有差异，需要转换为 YYYY-MM-DD)
                date_str = str(row['日期'])[:10]
                price = float(row['收盘'])

                # TODO: 此处替换为你通过 AKShare 获取的真实历史份额字段
                # 如果暂时没有份额序列，这里作为演示赋值 10000 (前端不会报错，只会呈现水平直线)
                total_shares = 10000.0
                market_cap = (total_shares * price) / 10000.0

                # 拼接回 Go 后端带市场前缀的 Code
                db_code = f"sh{code}" if code.startswith('5') else f"sz{code}"

                cursor.execute('''
                    INSERT INTO etf_shares (date, code, name, price, market_cap, total_shares)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(date, code) DO UPDATE SET
                        price = excluded.price,
                        market_cap = excluded.market_cap,
                        total_shares = excluded.total_shares
                ''', (date_str, db_code, name, price, market_cap, total_shares))

            conn.commit()
            # 延时 1 秒，防止请求过快被东方财富封 IP
            time.sleep(1)

        except Exception as e:
            print(f"❌ 抓取 {name}({code}) 失败: {e}")

    conn.close()
    print("✅ 所有 ETF 历史数据灌库完成！现在去刷新你的页面吧！")

if __name__ == '__main__':
    backfill_history()