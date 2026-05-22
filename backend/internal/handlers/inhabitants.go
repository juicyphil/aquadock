package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"aquadock/internal/models"

	"github.com/go-chi/chi/v5"
)

type InhabitantHandler struct {
	db interface {
		CreateInhabitant(*models.InhabitantCreate) (*models.Inhabitant, error)
		GetInhabitant(int64) (*models.Inhabitant, error)
		ListInhabitants(int64) ([]models.Inhabitant, error)
		UpdateInhabitant(int64, *models.Inhabitant) (*models.Inhabitant, error)
		DeleteInhabitant(int64) error
	}
}

func NewInhabitantHandler(db interface {
	CreateInhabitant(*models.InhabitantCreate) (*models.Inhabitant, error)
	GetInhabitant(int64) (*models.Inhabitant, error)
	ListInhabitants(int64) ([]models.Inhabitant, error)
	UpdateInhabitant(int64, *models.Inhabitant) (*models.Inhabitant, error)
	DeleteInhabitant(int64) error
}) *InhabitantHandler {
	return &InhabitantHandler{db: db}
}

func (h *InhabitantHandler) List(w http.ResponseWriter, r *http.Request) {
	tankID, err := strconv.ParseInt(chi.URLParam(r, "tankId"), 10, 64)
	if err != nil || tankID <= 0 {
		writeError(w, 400, "invalid tank id")
		return
	}
	inhabs, err := h.db.ListInhabitants(tankID)
	if err != nil {
		writeError(w, 500, "failed to list inhabitants")
		return
	}
	if inhabs == nil {
		inhabs = []models.Inhabitant{}
	}
	writeJSON(w, 200, inhabs)
}

func (h *InhabitantHandler) Create(w http.ResponseWriter, r *http.Request) {
	tankID, err := strconv.ParseInt(chi.URLParam(r, "tankId"), 10, 64)
	if err != nil || tankID <= 0 {
		writeError(w, 400, "invalid tank id")
		return
	}
	var req models.InhabitantCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	req.TankID = tankID
	if req.Emoji == "" {
		req.Emoji = "🐟"
	}
	if req.Count <= 0 {
		req.Count = 1
	}

	inhab, err := h.db.CreateInhabitant(&req)
	if err != nil {
		writeError(w, 500, "failed to create inhabitant")
		return
	}
	writeJSON(w, 201, inhab)
}

func (h *InhabitantHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, 400, "invalid inhabitant id")
		return
	}
	var req models.Inhabitant
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	req.TankID = 0
	inhab, err := h.db.UpdateInhabitant(id, &req)
	if err != nil {
		writeError(w, 500, "failed to update inhabitant")
		return
	}
	writeJSON(w, 200, inhab)
}

func (h *InhabitantHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, 400, "invalid inhabitant id")
		return
	}
	if err := h.db.DeleteInhabitant(id); err != nil {
		writeError(w, 500, "failed to delete inhabitant")
		return
	}
	w.WriteHeader(204)
}
