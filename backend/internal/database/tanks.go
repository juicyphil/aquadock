package database

import (
	"aquadock/internal/models"
	"fmt"
)

func (db *DB) CreateTank(t *models.TankCreate) (*models.Tank, error) {
	tracked := t.TrackedParams
	if tracked == "" {
		tracked = "ammonia,nitrite,nitrate,ph,temperature,gh,kh"
	}
	res, err := db.Exec(`INSERT INTO tanks (name, emoji, liters, type, subtype, setup_date, filter_type, photo_url, notes, tracked_params)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.Name, t.Emoji, t.Liters, t.Type, t.Subtype, t.SetupDate, t.FilterType, t.PhotoURL, t.Notes, tracked)
	if err != nil {
		return nil, fmt.Errorf("create tank: %w", err)
	}
	id, _ := res.LastInsertId()
	return db.GetTank(id)
}

func (db *DB) GetTank(id int64) (*models.Tank, error) {
	var t models.Tank
	var photoURL *string
	err := db.QueryRow(`SELECT id, name, emoji, liters, type, COALESCE(subtype,''), setup_date, COALESCE(filter_type,''), photo_url, COALESCE(notes,''), COALESCE(tracked_params,'ammonia,nitrite,nitrate,ph,temperature,gh,kh'), created_at FROM tanks WHERE id = ?`, id).
		Scan(&t.ID, &t.Name, &t.Emoji, &t.Liters, &t.Type, &t.Subtype, &t.SetupDate, &t.FilterType, &photoURL, &t.Notes, &t.TrackedParams, &t.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get tank: %w", err)
	}
	t.PhotoURL = photoURL
	return &t, nil
}

func (db *DB) ListTanks() ([]models.Tank, error) {
	rows, err := db.Query(`SELECT id, name, emoji, liters, type, COALESCE(subtype,''), setup_date, COALESCE(filter_type,''), photo_url, COALESCE(notes,''), COALESCE(tracked_params,'ammonia,nitrite,nitrate,ph,temperature,gh,kh'), created_at FROM tanks ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list tanks: %w", err)
	}
	defer rows.Close()

	var tanks []models.Tank
	for rows.Next() {
		var t models.Tank
		var photoURL *string
		if err := rows.Scan(&t.ID, &t.Name, &t.Emoji, &t.Liters, &t.Type, &t.Subtype, &t.SetupDate, &t.FilterType, &photoURL, &t.Notes, &t.TrackedParams, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan tank: %w", err)
		}
		t.PhotoURL = photoURL
		tanks = append(tanks, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows tank: %w", err)
	}
	return tanks, nil
}

func (db *DB) UpdateTank(id int64, u *models.TankUpdate) (*models.Tank, error) {
	sets := ""
	args := []interface{}{}
	if u.Name != nil { sets += "name = ?, "; args = append(args, *u.Name) }
	if u.Emoji != nil { sets += "emoji = ?, "; args = append(args, *u.Emoji) }
	if u.Liters != nil { sets += "liters = ?, "; args = append(args, *u.Liters) }
	if u.Type != nil { sets += "type = ?, "; args = append(args, *u.Type) }
	if u.Subtype != nil { sets += "subtype = ?, "; args = append(args, *u.Subtype) }
	if u.SetupDate != nil { sets += "setup_date = ?, "; args = append(args, *u.SetupDate) }
	if u.FilterType != nil { sets += "filter_type = ?, "; args = append(args, *u.FilterType) }
	if u.PhotoURL != nil { sets += "photo_url = ?, "; args = append(args, *u.PhotoURL) }
	if u.Notes != nil { sets += "notes = ?, "; args = append(args, *u.Notes) }
	if u.TrackedParams != nil { sets += "tracked_params = ?, "; args = append(args, *u.TrackedParams) }
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

func (db *DB) UpdateTankPhoto(id int64, photoURL string) error {
	_, err := db.Exec("UPDATE tanks SET photo_url=? WHERE id=?", photoURL, id)
	return err
}

func (db *DB) DeleteTank(id int64) error {
	_, err := db.Exec("DELETE FROM tanks WHERE id = ?", id)
	return err
}
