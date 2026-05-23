package database

import (
	"aquadock/internal/models"
	"fmt"
)

func (db *DB) CreateInhabitant(i *models.InhabitantCreate) (*models.Inhabitant, error) {
	photoURL := ""
	if i.PhotoURL != nil {
		photoURL = *i.PhotoURL
	}
	res, err := db.Exec(`INSERT INTO inhabitants (tank_id, name, species, count, emoji, added_date, notes, photo_url)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		i.TankID, i.Name, i.Species, i.Count, i.Emoji, i.AddedDate, i.Notes, photoURL)
	if err != nil {
		return nil, fmt.Errorf("create inhabitant: %w", err)
	}
	id, _ := res.LastInsertId()
	return db.GetInhabitant(id)
}

func (db *DB) GetInhabitant(id int64) (*models.Inhabitant, error) {
	var i models.Inhabitant
	err := db.QueryRow(`SELECT id, tank_id, name, COALESCE(species,''), count, emoji, added_date, COALESCE(notes,''), photo_url, created_at FROM inhabitants WHERE id = ?`, id).
		Scan(&i.ID, &i.TankID, &i.Name, &i.Species, &i.Count, &i.Emoji, &i.AddedDate, &i.Notes, &i.PhotoURL, &i.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get inhabitant: %w", err)
	}
	return &i, nil
}

func (db *DB) ListInhabitants(tankID int64) ([]models.Inhabitant, error) {
	rows, err := db.Query(`SELECT id, tank_id, name, COALESCE(species,''), count, emoji, added_date, COALESCE(notes,''), photo_url, created_at FROM inhabitants WHERE tank_id = ? ORDER BY created_at`, tankID)
	if err != nil {
		return nil, fmt.Errorf("list inhabitants: %w", err)
	}
	defer rows.Close()

	var inhabs []models.Inhabitant
	for rows.Next() {
		var i models.Inhabitant
		if err := rows.Scan(&i.ID, &i.TankID, &i.Name, &i.Species, &i.Count, &i.Emoji, &i.AddedDate, &i.Notes, &i.PhotoURL, &i.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan inhabitant: %w", err)
		}
		inhabs = append(inhabs, i)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows inhabitant: %w", err)
	}
	return inhabs, nil
}

func (db *DB) UpdateInhabitant(id int64, i *models.Inhabitant) (*models.Inhabitant, error) {
	photoURL := ""
	if i.PhotoURL != nil {
		photoURL = *i.PhotoURL
	}
	_, err := db.Exec(`UPDATE inhabitants SET name=?, species=?, count=?, emoji=?, added_date=?, notes=?, photo_url=? WHERE id=?`,
		i.Name, i.Species, i.Count, i.Emoji, i.AddedDate, i.Notes, photoURL, id)
	if err != nil {
		return nil, fmt.Errorf("update inhabitant: %w", err)
	}
	return db.GetInhabitant(id)
}

func (db *DB) UpdateInhabitantPhoto(id int64, photoURL string) error {
	_, err := db.Exec("UPDATE inhabitants SET photo_url = ? WHERE id = ?", photoURL, id)
	return err
}

func (db *DB) DeleteInhabitant(id int64) error {
	_, err := db.Exec("DELETE FROM inhabitants WHERE id = ?", id)
	return err
}
