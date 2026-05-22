package database

import (
	"aquadock/internal/models"
	"fmt"
)

func (db *DB) CreateEvent(e *models.EventCreate) (*models.Event, error) {
	res, err := db.Exec(`INSERT INTO events (tank_id, type, title, scheduled_date, scheduled_time, recurrence, note)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		e.TankID, e.Type, e.Title, e.ScheduledDate, e.ScheduledTime, e.Recurrence, e.Note)
	if err != nil {
		return nil, fmt.Errorf("create event: %w", err)
	}
	id, _ := res.LastInsertId()
	return db.GetEvent(id)
}

func (db *DB) GetEvent(id int64) (*models.Event, error) {
	var e models.Event
	var completedAt *string
	err := db.QueryRow(`SELECT id, tank_id, type, title, scheduled_date, COALESCE(scheduled_time,''), recurrence, completed_at, COALESCE(note,''), created_at FROM events WHERE id = ?`, id).
		Scan(&e.ID, &e.TankID, &e.Type, &e.Title, &e.ScheduledDate, &e.ScheduledTime, &e.Recurrence, &completedAt, &e.Note, &e.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get event: %w", err)
	}
	e.CompletedAt = completedAt
	return &e, nil
}

func (db *DB) ListAllEvents() ([]models.Event, error) {
	rows, err := db.Query(`SELECT id, tank_id, type, title, scheduled_date, COALESCE(scheduled_time,''), recurrence, completed_at, COALESCE(note,''), created_at
		FROM events ORDER BY scheduled_date, scheduled_time`)
	if err != nil {
		return nil, fmt.Errorf("list all events: %w", err)
	}
	defer rows.Close()
	return scanEvents(rows)
}

func (db *DB) ListEventsByDate(date string) ([]models.Event, error) {
	rows, err := db.Query(`SELECT e.id, e.tank_id, e.type, e.title, e.scheduled_date, COALESCE(e.scheduled_time,''), e.recurrence, e.completed_at, COALESCE(e.note,''), e.created_at
		FROM events e WHERE (e.recurrence != '' AND e.scheduled_date <= ?) OR (e.recurrence = '' AND e.scheduled_date = ?)
		ORDER BY e.scheduled_time, e.created_at`, date, date)
	if err != nil {
		return nil, fmt.Errorf("list events by date: %w", err)
	}
	defer rows.Close()
	return scanEvents(rows)
}

func (db *DB) ListEventsByTank(tankID int64, limit int) ([]models.Event, error) {
	if limit <= 0 { limit = 50 }
	rows, err := db.Query(`SELECT id, tank_id, type, title, scheduled_date, COALESCE(scheduled_time,''), recurrence, completed_at, COALESCE(note,''), created_at
		FROM events WHERE tank_id = ? ORDER BY scheduled_date DESC, scheduled_time LIMIT ?`, tankID, limit)
	if err != nil {
		return nil, fmt.Errorf("list events by tank: %w", err)
	}
	defer rows.Close()
	return scanEvents(rows)
}

func (db *DB) ListOverdueEvents() ([]models.Event, error) {
	rows, err := db.Query(`SELECT e.id, e.tank_id, e.type, e.title, e.scheduled_date, COALESCE(e.scheduled_time,''), e.recurrence, e.completed_at, COALESCE(e.note,''), e.created_at
		FROM events e WHERE (e.recurrence != '' AND e.scheduled_date < date('now')) OR (e.recurrence = '' AND e.scheduled_date < date('now') AND e.completed_at IS NULL)
		ORDER BY e.scheduled_date`)
	if err != nil {
		return nil, fmt.Errorf("list overdue events: %w", err)
	}
	defer rows.Close()
	return scanEvents(rows)
}

func (db *DB) ListUpcomingEvents(tankID int64, limit int) ([]models.Event, error) {
	if limit <= 0 { limit = 5 }
	rows, err := db.Query(`SELECT id, tank_id, type, title, scheduled_date, COALESCE(scheduled_time,''), recurrence, completed_at, COALESCE(note,''), created_at
		FROM events WHERE tank_id = ? AND completed_at IS NULL
		ORDER BY scheduled_date ASC, scheduled_time LIMIT ?`, tankID, limit)
	if err != nil {
		return nil, fmt.Errorf("list upcoming events: %w", err)
	}
	defer rows.Close()
	return scanEvents(rows)
}

func (db *DB) ListPendingEventsByDateRange(start, end string) ([]models.Event, error) {
	rows, err := db.Query(`SELECT e.id, e.tank_id, e.type, e.title, e.scheduled_date, COALESCE(e.scheduled_time,''), e.recurrence, e.completed_at, COALESCE(e.note,''), e.created_at
		FROM events e WHERE (e.recurrence != '' AND e.scheduled_date <= ?) OR (e.recurrence = '' AND e.scheduled_date >= ? AND e.scheduled_date <= ? AND e.completed_at IS NULL)
		ORDER BY e.scheduled_date, e.scheduled_time`, end, start, end)
	if err != nil {
		return nil, fmt.Errorf("list events by range: %w", err)
	}
	defer rows.Close()
	return scanEvents(rows)
}

func (db *DB) UpdateEvent(id int64, u *models.EventUpdate) (*models.Event, error) {
	sets := ""
	args := []interface{}{}
	if u.Type != nil { sets += "type = ?, "; args = append(args, *u.Type) }
	if u.Title != nil { sets += "title = ?, "; args = append(args, *u.Title) }
	if u.ScheduledDate != nil { sets += "scheduled_date = ?, "; args = append(args, *u.ScheduledDate) }
	if u.ScheduledTime != nil { sets += "scheduled_time = ?, "; args = append(args, *u.ScheduledTime) }
	if u.Recurrence != nil { sets += "recurrence = ?, "; args = append(args, *u.Recurrence) }
	if u.Note != nil { sets += "note = ?, "; args = append(args, *u.Note) }
	if sets == "" {
		return db.GetEvent(id)
	}
	sets = sets[:len(sets)-2]
	args = append(args, id)
	_, err := db.Exec("UPDATE events SET "+sets+" WHERE id = ?", args...)
	if err != nil {
		return nil, fmt.Errorf("update event: %w", err)
	}
	return db.GetEvent(id)
}

func (db *DB) CompleteEvent(id int64) error {
	_, err := db.Exec("UPDATE events SET completed_at = datetime('now') WHERE id = ?", id)
	return err
}

func (db *DB) CompleteEventInstance(id int64, date string) error {
	_, err := db.Exec("INSERT OR IGNORE INTO event_completions (event_id, completion_date) VALUES (?, ?)", id, date)
	return err
}

func (db *DB) SkipEventInstance(id int64, date string) error {
	_, err := db.Exec("INSERT OR IGNORE INTO event_skips (event_id, skip_date) VALUES (?, ?)", id, date)
	return err
}

func (db *DB) ListCompletionsByEvent(id int64) (map[string]bool, error) {
	rows, err := db.Query("SELECT completion_date FROM event_completions WHERE event_id = ?", id)
	if err != nil {
		return nil, fmt.Errorf("list completions: %w", err)
	}
	defer rows.Close()
	result := make(map[string]bool)
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, fmt.Errorf("scan completion: %w", err)
		}
		result[d] = true
	}
	return result, nil
}

func (db *DB) ListSkipsByEvent(id int64) (map[string]bool, error) {
	rows, err := db.Query("SELECT skip_date FROM event_skips WHERE event_id = ?", id)
	if err != nil {
		return nil, fmt.Errorf("list skips: %w", err)
	}
	defer rows.Close()
	result := make(map[string]bool)
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, fmt.Errorf("scan skip: %w", err)
		}
		result[d] = true
	}
	return result, nil
}

func (db *DB) UpdateEventDate(id int64, date, time string) error {
	_, err := db.Exec("UPDATE events SET scheduled_date = ?, scheduled_time = ? WHERE id = ?", date, time, id)
	return err
}

func (db *DB) DeleteEvent(id int64) error {
	_, err := db.Exec("DELETE FROM events WHERE id = ?", id)
	return err
}

func scanEvents(rows Rows) ([]models.Event, error) {
	var events []models.Event
	for rows.Next() {
		var e models.Event
		var completedAt *string
		if err := rows.Scan(&e.ID, &e.TankID, &e.Type, &e.Title, &e.ScheduledDate, &e.ScheduledTime, &e.Recurrence, &completedAt, &e.Note, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}
		e.CompletedAt = completedAt
		events = append(events, e)
	}
	return events, nil
}

type Rows interface {
	Next() bool
	Scan(dest ...interface{}) error
	Close() error
}
