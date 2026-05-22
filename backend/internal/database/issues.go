package database

import (
	"aquadock/internal/models"
	"fmt"
	"time"
)

func (db *DB) CreateIssue(i *models.IssueCreate) (*models.Issue, error) {
	if i.ObservedDate == "" {
		i.ObservedDate = time.Now().UTC().Format("2006-01-02")
	}
	res, err := db.Exec(`INSERT INTO issues (tank_id, title, description, observed_date)
		VALUES (?, ?, ?, ?)`,
		i.TankID, i.Title, i.Description, i.ObservedDate)
	if err != nil {
		return nil, fmt.Errorf("create issue: %w", err)
	}
	id, _ := res.LastInsertId()
	return db.GetIssue(id)
}

func (db *DB) GetIssue(id int64) (*models.Issue, error) {
	var i models.Issue
	var resolvedAt, photoURL *string
	err := db.QueryRow(`SELECT id, tank_id, title, COALESCE(description,''), observed_date, resolved_at, photo_url, created_at, updated_at
		FROM issues WHERE id = ?`, id).
		Scan(&i.ID, &i.TankID, &i.Title, &i.Description, &i.ObservedDate, &resolvedAt, &photoURL, &i.CreatedAt, &i.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get issue: %w", err)
	}
	i.ResolvedAt = resolvedAt
	i.PhotoURL = photoURL
	return &i, nil
}

func (db *DB) ListIssuesByTank(tankID int64) ([]models.Issue, error) {
	rows, err := db.Query(`SELECT id, tank_id, title, COALESCE(description,''), observed_date, resolved_at, photo_url, created_at, updated_at
		FROM issues WHERE tank_id = ? ORDER BY observed_date DESC, created_at DESC`, tankID)
	if err != nil {
		return nil, fmt.Errorf("list issues by tank: %w", err)
	}
	defer rows.Close()
	return scanIssues(rows)
}

func (db *DB) UpdateIssue(id int64, u *models.IssueUpdate) (*models.Issue, error) {
	sets := "updated_at = datetime('now'), "
	args := []interface{}{}
	if u.Title != nil { sets += "title = ?, "; args = append(args, *u.Title) }
	if u.Description != nil { sets += "description = ?, "; args = append(args, *u.Description) }
	if u.ObservedDate != nil { sets += "observed_date = ?, "; args = append(args, *u.ObservedDate) }
	if u.ResolvedAt != nil { sets += "resolved_at = ?, "; args = append(args, *u.ResolvedAt) }
	sets = sets[:len(sets)-2]
	args = append(args, id)
	_, err := db.Exec("UPDATE issues SET "+sets+" WHERE id = ?", args...)
	if err != nil {
		return nil, fmt.Errorf("update issue: %w", err)
	}
	return db.GetIssue(id)
}

func (db *DB) UpdateIssuePhoto(id int64, photoURL string) error {
	_, err := db.Exec("UPDATE issues SET photo_url = ?, updated_at = datetime('now') WHERE id = ?", photoURL, id)
	return err
}

func (db *DB) DeleteIssue(id int64) error {
	_, err := db.Exec("DELETE FROM issues WHERE id = ?", id)
	return err
}

func scanIssues(rows Rows) ([]models.Issue, error) {
	var issues []models.Issue
	for rows.Next() {
		var i models.Issue
		var resolvedAt, photoURL *string
		if err := rows.Scan(&i.ID, &i.TankID, &i.Title, &i.Description, &i.ObservedDate, &resolvedAt, &photoURL, &i.CreatedAt, &i.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan issue: %w", err)
		}
		i.ResolvedAt = resolvedAt
		i.PhotoURL = photoURL
		issues = append(issues, i)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows issue: %w", err)
	}
	return issues, nil
}
