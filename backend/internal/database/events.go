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

func (db *DB) ListEventsByDate(date string) ([]models.Event, error) {
	rows, err := db.Query(`SELECT e.id, e.tank_id, e.type, e.title, e.scheduled_date, COALESCE(e.scheduled_time,''), e.recurrence, e.completed_at, COALESCE(e.note,''), e.created_at
		FROM events e WHERE e.scheduled_date = ? ORDER BY e.scheduled_time, e.created_at`, date)
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
		FROM events e WHERE e.scheduled_date < date('now') AND e.completed_at IS NULL ORDER BY e.scheduled_date`)
	if err != nil {
		return nil, fmt.Errorf("list overdue events: %w", err)
	}
	defer rows.Close()
	return scanEvents(rows)
}

func (db *DB) ListPendingEventsByDateRange(start, end string) ([]models.Event, error) {
	rows, err := db.Query(`SELECT e.id, e.tank_id, e.type, e.title, e.scheduled_date, COALESCE(e.scheduled_time,''), e.recurrence, e.completed_at, COALESCE(e.note,''), e.created_at
		FROM events e WHERE e.scheduled_date >= ? AND e.scheduled_date <= ? AND e.completed_at IS NULL
		ORDER BY e.scheduled_date, e.scheduled_time`, start, end)
	if err != nil {
		return nil, fmt.Errorf("list events by range: %w", err)
	}
	defer rows.Close()
	return scanEvents(rows)
}

func (db *DB) ListTodayPending() ([]models.Event, error) {
	return db.ListEventsByDate("date('now')")
}

func (db *DB) CompleteEvent(id int64) error {
	_, err := db.Exec("UPDATE events SET completed_at = datetime('now') WHERE id = ?", id)
	return err
}

func (db *DB) UpdateEventDate(id int64, date, time string) error {
	_, err := db.Exec("UPDATE events SET scheduled_date = ?, scheduled_time = ? WHERE id = ?", date, time, id)
	return err
}

func (db *DB) UpdateEventRecurrence(id int64, recurrence string) error {
	_, err := db.Exec("UPDATE events SET recurrence = ? WHERE id = ?", recurrence, id)
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
