package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

type DB struct {
	*sql.DB
}

func New(dbPath string) (*DB, error) {
	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_foreign_keys=on&_loc=auto")
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	db.SetMaxOpenConns(1)

	d := &DB{db}
	if err := d.Init(); err != nil {
		return nil, fmt.Errorf("init schema: %w", err)
	}
	return d, nil
}

func (db *DB) Init() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		email TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS tanks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id),
		name TEXT NOT NULL,
		emoji TEXT NOT NULL DEFAULT '🐠',
		liters REAL NOT NULL,
		type TEXT NOT NULL CHECK(type IN ('freshwater','saltwater','coldwater')),
		subtype TEXT,
		setup_date TEXT NOT NULL,
		filter_type TEXT,
		photo_url TEXT,
		notes TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS inhabitants (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tank_id INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
		name TEXT NOT NULL DEFAULT '',
		species TEXT,
		count INTEGER NOT NULL DEFAULT 1,
		emoji TEXT NOT NULL DEFAULT '🐟',
		added_date TEXT NOT NULL DEFAULT (datetime('now')),
		notes TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tank_id INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
		type TEXT NOT NULL CHECK(type IN ('feed','water_change','clean_filter','test_water','trim_plants','medicate','top_off','other')),
		title TEXT NOT NULL DEFAULT '',
		scheduled_date TEXT NOT NULL,
		scheduled_time TEXT,
		recurrence TEXT,
		completed_at TEXT,
		note TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS event_completions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
		completion_date TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		UNIQUE(event_id, completion_date)
	);

	CREATE TABLE IF NOT EXISTS event_skips (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
		skip_date TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		UNIQUE(event_id, skip_date)
	);

	CREATE TABLE IF NOT EXISTS issues (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tank_id INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
		title TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		observed_date TEXT NOT NULL,
		resolved_at TEXT,
		photo_url TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS water_params (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tank_id INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
		tested_at TEXT NOT NULL DEFAULT (datetime('now')),
		ammonia REAL,
		nitrite REAL,
		nitrate REAL,
		ph REAL,
		temperature REAL,
		gh REAL,
		kh REAL,
		notes TEXT
	);

	CREATE TABLE IF NOT EXISTS param_ranges (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tank_subtype TEXT NOT NULL UNIQUE,
		ammonia_min REAL, ammonia_max REAL,
		nitrite_min REAL, nitrite_max REAL,
		nitrate_min REAL, nitrate_max REAL,
		ph_min REAL, ph_max REAL,
		temp_min REAL, temp_max REAL,
		gh_min REAL, gh_max REAL,
		kh_min REAL, kh_max REAL
	);

	CREATE INDEX IF NOT EXISTS idx_inhabitants_tank ON inhabitants(tank_id);
	CREATE INDEX IF NOT EXISTS idx_events_tank ON events(tank_id);
	CREATE INDEX IF NOT EXISTS idx_events_date ON events(scheduled_date);
	CREATE INDEX IF NOT EXISTS idx_events_completed ON events(completed_at);
	CREATE INDEX IF NOT EXISTS idx_completions_event ON event_completions(event_id);
	CREATE INDEX IF NOT EXISTS idx_skips_event ON event_skips(event_id);
	CREATE INDEX IF NOT EXISTS idx_issues_tank ON issues(tank_id);
	CREATE INDEX IF NOT EXISTS idx_params_tank ON water_params(tank_id);
	CREATE INDEX IF NOT EXISTS idx_params_tested ON water_params(tested_at);
	`

	if _, err := db.Exec(schema); err != nil {
		return fmt.Errorf("exec schema: %w", err)
	}

	db.Exec("ALTER TABLE tanks ADD COLUMN photo_url TEXT")
	db.Exec("ALTER TABLE tanks ADD COLUMN tracked_params TEXT NOT NULL DEFAULT 'ammonia,nitrite,nitrate,ph,temperature,gh,kh'")

	if err := db.seedParamRanges(); err != nil {
		return err
	}
	return db.seedDemoUser()
}

func (db *DB) seedDemoUser() error {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil || count > 0 {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash demo password: %w", err)
	}
	res, err := db.Exec("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
		"demo", "demo@aquadock.local", string(hash))
	if err != nil {
		return fmt.Errorf("create demo user: %w", err)
	}
	userID, _ := res.LastInsertId()
	log.Printf("created demo user id=%d (username=demo, password=demo123)", userID)

	tracked := "ammonia,nitrite,nitrate,ph,temperature,gh,kh"
	setupDate := time.Now().AddDate(0, -3, 0).Format("2006-01-02")
	tr, err := db.Exec(`INSERT INTO tanks (user_id, name, emoji, liters, type, subtype, setup_date, tracked_params)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, "Amazon Paradise", "🌿", 120, "freshwater", "community", setupDate, tracked)
	if err != nil {
		return fmt.Errorf("create demo tank: %w", err)
	}
	tankID, _ := tr.LastInsertId()

	for _, inh := range []struct{ name, species, count, emoji string }{
		{"Neon Tetra", "Paracheirodon innesi", "12", "🐟"},
		{"Corydoras", "Corydoras paleatus", "6", "🐡"},
		{"Nerite Snail", "Neritina natalensis", "3", "🐌"},
	} {
		_, err := db.Exec(`INSERT INTO inhabitants (tank_id, name, species, count, emoji) VALUES (?, ?, ?, ?, ?)`,
			tankID, inh.name, inh.species, inh.count, inh.emoji)
		if err != nil {
			log.Printf("seed demo inhabitant: %v", err)
		}
	}

	for _, ev := range []struct{ t, title, rec string }{
		{"feed", "Feed the fish", "1d"},
		{"water_change", "Water change", "7d"},
		{"test_water", "Test water parameters", "7d"},
		{"clean_filter", "Clean filter", "14d"},
	} {
		_, err := db.Exec(`INSERT INTO events (tank_id, type, title, scheduled_date, recurrence) VALUES (?, ?, ?, ?, ?)`,
			tankID, ev.t, ev.title, setupDate, ev.rec)
		if err != nil {
			log.Printf("seed demo event: %v", err)
		}
	}

	for i := 0; i < 8; i++ {
		day := time.Now().AddDate(0, 0, -(7 - i)*3)
		_, err := db.Exec(`INSERT INTO water_params (tank_id, tested_at, ammonia, nitrite, nitrate, ph, temperature, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			tankID, day.Format("2006-01-02 15:04:05"),
			0.0, 0.0, 5.0+float64(i)*2.0, 7.0, 25.0, "Demo test reading")
		if err != nil {
			log.Printf("seed demo water param: %v", err)
		}
	}

	return nil
}

func (db *DB) seedParamRanges() error {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM param_ranges").Scan(&count)
	if err != nil || count > 0 {
		return err
	}

	ranges := []struct {
		subtype            string
		ammMin, ammMax    float64
		nitMin, nitMax     float64
		natMin, natMax     float64
		phMin, phMax       float64
		tMin, tMax         float64
		ghMin, ghMax       float64
		khMin, khMax       float64
	}{
		{"community", 0, 0.25, 0, 0.5, 0, 40, 6.5, 7.8, 22, 28, 4, 12, 3, 8},
		{"planted", 0, 0.25, 0, 0.5, 0, 20, 6.0, 7.5, 22, 28, 3, 8, 2, 6},
		{"nano", 0, 0.25, 0, 0.5, 0, 30, 6.5, 7.5, 22, 26, 4, 10, 3, 8},
		{"cichlid", 0, 0.25, 0, 0.5, 0, 50, 7.5, 8.5, 24, 28, 8, 16, 6, 12},
		{"brackish", 0, 0.25, 0, 0.5, 0, 40, 7.5, 8.5, 22, 28, 8, 16, 6, 12},
		{"reef", 0, 0.1, 0, 0.2, 0, 10, 8.0, 8.4, 24, 28, 0, 0, 8, 12},
		{"fowlr", 0, 0.1, 0, 0.2, 0, 20, 8.0, 8.4, 24, 28, 0, 0, 8, 12},
		{"sw_nano", 0, 0.1, 0, 0.2, 0, 15, 8.0, 8.4, 24, 28, 0, 0, 8, 12},
		{"macroalgae", 0, 0.1, 0, 0.2, 0, 5, 8.0, 8.4, 22, 26, 0, 0, 8, 12},
		{"goldfish", 0, 0.5, 0, 1.0, 0, 80, 7.0, 8.0, 18, 24, 4, 12, 3, 8},
		{"pond", 0, 0.5, 0, 1.0, 0, 100, 6.5, 8.5, 15, 25, 4, 12, 3, 8},
		{"temperate", 0, 0.25, 0, 0.5, 0, 40, 6.5, 8.0, 15, 22, 4, 12, 3, 8},
	}

	for _, r := range ranges {
		_, err := db.Exec(`INSERT INTO param_ranges (
			tank_subtype, ammonia_min, ammonia_max, nitrite_min, nitrite_max,
			nitrate_min, nitrate_max, ph_min, ph_max, temp_min, temp_max,
			gh_min, gh_max, kh_min, kh_max
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			r.subtype, r.ammMin, r.ammMax, r.nitMin, r.nitMax,
			r.natMin, r.natMax, r.phMin, r.phMax, r.tMin, r.tMax,
			r.ghMin, r.ghMax, r.khMin, r.khMax)
		if err != nil {
			log.Printf("seed param_range %s: %v", r.subtype, err)
		}
	}
	return nil
}
