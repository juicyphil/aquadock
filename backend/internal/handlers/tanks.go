package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"aquadock/internal/models"

	"github.com/go-chi/chi/v5"
)

type TankHandler struct {
	db interface {
		CreateTank(*models.TankCreate) (*models.Tank, error)
		GetTank(int64) (*models.Tank, error)
		ListTanks() ([]models.Tank, error)
		UpdateTank(int64, *models.TankUpdate) (*models.Tank, error)
		DeleteTank(int64) error
	}
}

func NewTankHandler(db interface {
	CreateTank(*models.TankCreate) (*models.Tank, error)
	GetTank(int64) (*models.Tank, error)
	ListTanks() ([]models.Tank, error)
	UpdateTank(int64, *models.TankUpdate) (*models.Tank, error)
	DeleteTank(int64) error
}) *TankHandler {
	return &TankHandler{db: db}
}

func (h *TankHandler) List(w http.ResponseWriter, r *http.Request) {
	tanks, err := h.db.ListTanks()
	if err != nil {
		writeError(w, 500, "failed to list tanks")
		return
	}
	if tanks == nil {
		tanks = []models.Tank{}
	}
	writeJSON(w, 200, tanks)
}

func (h *TankHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.TankCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	if req.Name == "" {
		writeError(w, 400, "name is required")
		return
	}
	if req.Emoji == "" {
		req.Emoji = "🐠"
	}
	if req.SetupDate == "" {
		writeError(w, 400, "setup_date is required")
		return
	}

	tank, err := h.db.CreateTank(&req)
	if err != nil {
		writeError(w, 500, "failed to create tank")
		return
	}
	writeJSON(w, 201, tank)
}

func (h *TankHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	tank, err := h.db.GetTank(id)
	if err != nil {
		writeError(w, 404, "tank not found")
		return
	}
	writeJSON(w, 200, tank)
}

func (h *TankHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req models.TankUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	tank, err := h.db.UpdateTank(id, &req)
	if err != nil {
		writeError(w, 500, "failed to update tank")
		return
	}
	writeJSON(w, 200, tank)
}

func (h *TankHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.db.DeleteTank(id); err != nil {
		writeError(w, 500, "failed to delete tank")
		return
	}
	w.WriteHeader(204)
}
