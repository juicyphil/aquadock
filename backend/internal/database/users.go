package database

import (
	"aquadock/internal/models"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func (db *DB) CreateUser(u *models.UserCreate) (*models.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}
	res, err := db.Exec("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
		u.Username, u.Email, string(hash))
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	id, _ := res.LastInsertId()
	return db.GetUser(id)
}

func (db *DB) GetUser(id int64) (*models.User, error) {
	var u models.User
	err := db.QueryRow("SELECT id, username, email, password_hash, created_at FROM users WHERE id = ?", id).
		Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return &u, nil
}

func (db *DB) GetUserByUsername(username string) (*models.User, error) {
	var u models.User
	err := db.QueryRow("SELECT id, username, email, password_hash, created_at FROM users WHERE username = ?", username).
		Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get user by username: %w", err)
	}
	return &u, nil
}
