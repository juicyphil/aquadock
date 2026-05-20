package database

import (
	"aquadock/internal/models"
	"fmt"
)

func (db *DB) CreateTank(t *models.TankCreate) (*models.Tank, error) {
	res, err := db.Exec(`INSERT INTO tanks (name, emoji, gallons, type, subtype, setup_date, filter_type, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		t.Name, t.Emoji, t.Gallons, t.Type, t.Subtype, t.SetupDate, t.FilterType, t.Notes)
	if err != nil {
		return nil, fmt.Errorf("create tank: %w", err)
	}
	id, _ := res.LastInsertId()
	return db.GetTank(id)
}

func (db *DB) GetTank(id int64) (*models.Tank, error) {
	var t models.Tank
	err := db.QueryRow(`SELECT id, name, emoji, gallons, type, COALESCE(subtype,''), setup_date, COALESCE(filter_type,''), COALESCE(notes,''), created_at FROM tanks WHERE id = ?`, id).
		Scan(&t.ID, &t.Name, &t.Emoji, &t.Gallons, &t.Type, &t.Subtype, &t.SetupDate, &t.FilterType, &t.Notes, &t.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get tank: %w", err)
	}
	return &t, nil
}

func (db *DB) ListTanks() ([]models.Tank, error) {
	rows, err := db.Query(`SELECT id, name, emoji, gallons, type, COALESCE(subtype,''), setup_date, COALESCE(filter_type,''), COALESCE(notes,''), created_at FROM tanks ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list tanks: %w", err)
	}
	defer rows.Close()

	var tanks []models.Tank
	for rows.Next() {
		var t models.Tank
		if err := rows.Scan(&t.ID, &t.Name, &t.Emoji, &t.Gallons, &t.Type, &t.Subtype, &t.SetupDate, &t.FilterType, &t.Notes, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan tank: %w", err)
		}
		tanks = append(tanks, t)
	}
	return tanks, nil
}

func (db *DB) UpdateTank(id int64, u *models.TankUpdate) (*models.Tank, error) {
	sets := ""
	args := []interface{}{}
	if u.Name != nil { sets += "name = ?, "; args = append(args, *u.Name) }
	if u.Emoji != nil { sets += "emoji = ?, "; args = append(args, *u.Emoji) }
	if u.Gallons != nil { sets += "gallons = ?, "; args = append(args, *u.Gallons) }
	if u.Type != nil { sets += "type = ?, "; args = append(args, *u.Type) }
	if u.Subtype != nil { sets += "subtype = ?, "; args = append(args, *u.Subtype) }
	if u.SetupDate != nil { sets += "setup_date = ?, "; args = append(args, *u.SetupDate) }
	if u.FilterType != nil { sets += "filter_type = ?, "; args = append(args, *u.FilterType) }
	if u.Notes != nil { sets += "notes = ?, "; args = append(args, *u.Notes) }
	if sets == "" {
		return db.GetTank(id)
	}
	sets = sets[:len(sets)-2]
	args = append(args, id)
	_, err := db.Exec("UPDATE tanks SET "+sets+" WHERE id = ?", args...)
	if err != nil {
		return nil, fmt.Errorf("update tank: %w", err)
	}
	return db.GetTank(id)
}

func (db *DB) DeleteTank(id int64) error {
	_, err := db.Exec("DELETE FROM tanks WHERE id = ?", id)
	return err
}
