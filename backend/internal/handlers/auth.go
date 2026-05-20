package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"aquadock/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db        interface {
		CreateUser(*models.UserCreate) (*models.User, error)
		GetUserByUsername(string) (*models.User, error)
		GetUser(int64) (*models.User, error)
	}
	jwtSecret string
}

func NewAuthHandler(db interface {
	CreateUser(*models.UserCreate) (*models.User, error)
	GetUserByUsername(string) (*models.User, error)
	GetUser(int64) (*models.User, error)
}, jwtSecret string) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: jwtSecret}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.UserCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	if req.Username == "" || req.Password == "" || req.Email == "" {
		writeError(w, 400, "username, email, and password required")
		return
	}

	user, err := h.db.CreateUser(&req)
	if err != nil {
		writeError(w, 409, "username or email already taken")
		return
	}

	token, err := h.generateToken(user.ID)
	if err != nil {
		writeError(w, 500, "failed to generate token")
		return
	}

	writeJSON(w, 201, models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}

	user, err := h.db.GetUserByUsername(req.Username)
	if err != nil {
		writeError(w, 401, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeError(w, 401, "invalid credentials")
		return
	}

	token, err := h.generateToken(user.ID)
	if err != nil {
		writeError(w, 500, "failed to generate token")
		return
	}

	writeJSON(w, 200, models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) Status(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int64)
	user, err := h.db.GetUser(userID)
	if err != nil {
		writeError(w, 401, "not authenticated")
		return
	}
	writeJSON(w, 200, user)
}

func (h *AuthHandler) generateToken(userID int64) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}
