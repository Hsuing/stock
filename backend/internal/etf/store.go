
package etf

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"time"

	"easy-stock/backend/internal/foundation"
	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

var defaultTracked = []string{
	"sh510300", "sh510500", "sh510050", "sz159915", "sh588000",
	"sh512880", "sh512000", "sh512170", "sh512690", "sz159995",
	"sh512480", "sz159928", "sh515030", "sz159949", "sh512290",
	"sh515790", "sz159845", "sh512100", "sh515880", "sz159806",
	"sh513050", "sh513180", "sh512760", "sz159905", "sh510880",
	"sz159628", "sz159350", "sh515090", "sh510210", "sz159663",
	"sh588170", "sz159516", "sz159546", "sh588200", "sh589070",
}

func OpenStore(path string) (*Store, error) {
	if strings.TrimSpace(path) == "" {
		path = ":memory:"
	}
	dataSource := path
	if path == ":memory:" {
		dataSource = "file:easy-stock-etf?mode=memory&cache=shared"
	} else {
		if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
			return nil, err
		}
	}

	db, err := sql.Open("sqlite", dataSource)
	if err != nil {
		return nil, err
	}

	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS etf_shares (
			date TEXT NOT NULL,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			price REAL NOT NULL,
			market_cap REAL NOT NULL,
			total_shares REAL NOT NULL,
			PRIMARY KEY (date, code)
		);
		CREATE TABLE IF NOT EXISTS tracked_etfs (
			code TEXT PRIMARY KEY
		);
	`); err != nil {
		db.Close()
		return nil, err
	}

	// Seed tracked_etfs if empty
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM tracked_etfs").Scan(&count); err == nil && count == 0 {
		for _, code := range defaultTracked {
			db.Exec("INSERT OR IGNORE INTO tracked_etfs (code) VALUES (?)", code)
		}
	}

	return &Store{db: db}, nil
}


func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) SaveSnapshot(date string, shares []foundation.ETFShare) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO etf_shares (date, code, name, price, market_cap, total_shares)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(date, code) DO UPDATE SET
			price = excluded.price,
			market_cap = excluded.market_cap,
			total_shares = excluded.total_shares,
			name = excluded.name
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, share := range shares {
		// Calculate market cap backwards: MarketCap = (TotalShares * Price) / 10000
		marketCap := (share.TotalShares * share.Price) / 10000
		if _, err := stmt.Exec(date, share.Symbol, share.Name, share.Price, marketCap, share.TotalShares); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *Store) GetLatestDate() (string, error) {
	var date string
	err := s.db.QueryRow("SELECT MAX(date) FROM etf_shares").Scan(&date)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return date, nil
}

func (s *Store) GetPreviousDate(currentDate string) (string, error) {
	var prevDate string
	err := s.db.QueryRow("SELECT MAX(date) FROM etf_shares WHERE date < ?", currentDate).Scan(&prevDate)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return prevDate, nil
}

func (s *Store) GetSharesByDate(date string) (map[string]foundation.ETFShare, error) {
	rows, err := s.db.Query("SELECT code, name, total_shares FROM etf_shares WHERE date = ?", date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make(map[string]foundation.ETFShare)
	for rows.Next() {
		var code, name string
		var totalShares float64
		if err := rows.Scan(&code, &name, &totalShares); err != nil {
			return nil, err
		}
		res[code] = foundation.ETFShare{
			Symbol:      code,
			Name:        name,
			TotalShares: totalShares,
		}
	}
	return res, nil
}

func (s *Store) GetHistory(code string, limit int) ([]foundation.ETFShare, error) {
	rows, err := s.db.Query(`
		SELECT date, total_shares, price, market_cap
		FROM etf_shares 
		WHERE code = ? 
		ORDER BY date DESC 
		LIMIT ?`, code, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []foundation.ETFShare
	for rows.Next() {
		var date string
		var totalShares, price, marketCap float64
		if err := rows.Scan(&date, &totalShares, &price, &marketCap); err != nil {
			return nil, err
		}
		history = append(history, foundation.ETFShare{
			Symbol:      code,
			TotalShares: totalShares,
			TradeDate:   date,
			Price:       price,
		})
	}
	return history, nil
}

func (s *Store) GetSharesByClosestDate(currentDate string, offsetDays int) (map[string]foundation.ETFShare, error) {
	// Parse current date
	t, err := time.Parse("2006-01-02", currentDate)
	if err != nil {
		return nil, err
	}
	targetDate := t.AddDate(0, 0, -offsetDays).Format("2006-01-02")

	// Find the MAX(date) that is <= targetDate
	var closestDate string
	err = s.db.QueryRow("SELECT MAX(date) FROM etf_shares WHERE date <= ?", targetDate).Scan(&closestDate)
	if err != nil {
		if err == sql.ErrNoRows {
			// If no date found before target, try to find MIN(date) to at least show something
			err = s.db.QueryRow("SELECT MIN(date) FROM etf_shares").Scan(&closestDate)
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	
	if closestDate == "" {
		return nil, nil
	}

	return s.GetSharesByDate(closestDate)
}



func (s *Store) GetTrackedETFs() ([]string, error) {
	rows, err := s.db.Query("SELECT code FROM tracked_etfs")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var codes []string
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err == nil {
			codes = append(codes, code)
		}
	}
	return codes, nil
}

func (s *Store) AddTrackedETF(code string) error {
	_, err := s.db.Exec("INSERT OR IGNORE INTO tracked_etfs (code) VALUES (?)", code)
	return err
}

