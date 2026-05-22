package database

import (
	"aquadock/internal/models"
	"fmt"
)

func (db *DB) CreateInhabitant(i *models.InhabitantCreate) (*models.Inhabitant, error) {
	res, err := db.Exec(`INSERT INTO inhabitants (tank_id, name, species, count, emoji, added_date, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		i.TankID, i.Name, i.Species, i.Count, i.Emoji, i.AddedDate, i.Notes)
	if err != nil {
		return nil, fmt.Errorf("create inhabitant: %w", err)
	}
	id, _ := res.LastInsertId()
	return db.GetInhabitant(id)
}

func (db *DB) GetInhabitant(id int64) (*models.Inhabitant, error) {
	var i models.Inhabitant
	err := db.QueryRow(`SELECT id, tank_id, name, COALESCE(species,''), count, emoji, added_date, COALESCE(notes,''), created_at FROM inhabitants WHERE id = ?`, id).
		Scan(&i.ID, &i.TankID, &i.Name, &i.Species, &i.Count, &i.Emoji, &i.AddedDate, &i.Notes, &i.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get inhabitant: %w", err)
	}
	return &i, nil
}

func (db *DB) ListInhabitants(tankID int64) ([]models.Inhabitant, error) {
	rows, err := db.Query(`SELECT id, tank_id, name, COALESCE(species,''), count, emoji, added_date, COALESCE(notes,''), created_at FROM inhabitants WHERE tank_id = ? ORDER BY created_at`, tankID)
	if err != nil {
		return nil, fmt.Errorf("list inhabitants: %w", err)
	}
	defer rows.Close()

	var inhabs []models.Inhabitant
	for rows.Next() {
		var i models.Inhabitant
		if err := rows.Scan(&i.ID, &i.TankID, &i.Name, &i.Species, &i.Count, &i.Emoji, &i.AddedDate, &i.Notes, &i.CreatedAt); err != nil {
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
	_, err := db.Exec(`UPDATE inhabitants SET name=?, species=?, count=?, emoji=?, added_date=?, notes=? WHERE id=?`,
		i.Name, i.Species, i.Count, i.Emoji, i.AddedDate, i.Notes, id)
	if err != nil {
		return nil, fmt.Errorf("update inhabitant: %w", err)
	}
	return db.GetInhabitant(id)
}

func (db *DB) DeleteInhabitant(id int64) error {
	_, err := db.Exec("DELETE FROM inhabitants WHERE id = ?", id)
	return err
}
