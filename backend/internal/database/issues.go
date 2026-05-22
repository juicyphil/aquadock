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

func (db *DB) CreateIssuePhoto(issueID int64, photoURL, caption string) (*models.IssuePhoto, error) {
	res, err := db.Exec("INSERT INTO issue_photos (issue_id, photo_url, caption) VALUES (?, ?, ?)", issueID, photoURL, caption)
	if err != nil {
		return nil, fmt.Errorf("create issue photo: %w", err)
	}
	id, _ := res.LastInsertId()
	return db.GetIssuePhoto(id)
}

func (db *DB) GetIssuePhoto(id int64) (*models.IssuePhoto, error) {
	var p models.IssuePhoto
	err := db.QueryRow("SELECT id, issue_id, photo_url, COALESCE(caption,''), created_at FROM issue_photos WHERE id = ?", id).
		Scan(&p.ID, &p.IssueID, &p.PhotoURL, &p.Caption, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get issue photo: %w", err)
	}
	return &p, nil
}

func (db *DB) ListIssuePhotos(issueID int64) ([]models.IssuePhoto, error) {
	rows, err := db.Query("SELECT id, issue_id, photo_url, COALESCE(caption,''), created_at FROM issue_photos WHERE issue_id = ? ORDER BY created_at", issueID)
	if err != nil {
		return nil, fmt.Errorf("list issue photos: %w", err)
	}
	defer rows.Close()
	var photos []models.IssuePhoto
	for rows.Next() {
		var p models.IssuePhoto
		if err := rows.Scan(&p.ID, &p.IssueID, &p.PhotoURL, &p.Caption, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan issue photo: %w", err)
		}
		photos = append(photos, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows issue photo: %w", err)
	}
	return photos, nil
}

func (db *DB) DeleteIssuePhoto(id int64) error {
	_, err := db.Exec("DELETE FROM issue_photos WHERE id = ?", id)
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
