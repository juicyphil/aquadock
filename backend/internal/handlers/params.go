package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"aquadock/internal/models"

	"github.com/go-chi/chi/v5"
)

type ParamHandler struct {
	db interface {
		CreateWaterParam(*models.WaterParamCreate) (*models.WaterParam, error)
		GetWaterParam(int64) (*models.WaterParam, error)
		ListWaterParams(int64, int) ([]models.WaterParam, error)
		GetLatestWaterParam(int64) (*models.WaterParam, error)
		DeleteWaterParam(int64) error
		GetParamRange(string) (*models.ParamRange, error)
		ListParamRanges() ([]models.ParamRange, error)
		UpdateParamRange(*models.ParamRange) error
	}
}

func NewParamHandler(db interface {
	CreateWaterParam(*models.WaterParamCreate) (*models.WaterParam, error)
	GetWaterParam(int64) (*models.WaterParam, error)
	ListWaterParams(int64, int) ([]models.WaterParam, error)
	GetLatestWaterParam(int64) (*models.WaterParam, error)
	DeleteWaterParam(int64) error
	GetParamRange(string) (*models.ParamRange, error)
	ListParamRanges() ([]models.ParamRange, error)
	UpdateParamRange(*models.ParamRange) error
}) *ParamHandler {
	return &ParamHandler{db: db}
}

func (h *ParamHandler) Create(w http.ResponseWriter, r *http.Request) {
	tankID, err := strconv.ParseInt(chi.URLParam(r, "tankId"), 10, 64)
	if err != nil || tankID <= 0 {
		writeError(w, 400, "invalid tank id")
		return
	}
	var req models.WaterParamCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	req.TankID = tankID
	param, err := h.db.CreateWaterParam(&req)
	if err != nil {
		writeError(w, 500, "failed to create water param")
		return
	}
	writeJSON(w, 201, param)
}

func (h *ParamHandler) List(w http.ResponseWriter, r *http.Request) {
	tankID, err := strconv.ParseInt(chi.URLParam(r, "tankId"), 10, 64)
	if err != nil || tankID <= 0 {
		writeError(w, 400, "invalid tank id")
		return
	}
	params, err := h.db.ListWaterParams(tankID, 30)
	if err != nil {
		writeError(w, 500, "failed to list params")
		return
	}
	if params == nil {
		params = []models.WaterParam{}
	}
	writeJSON(w, 200, params)
}

func (h *ParamHandler) Latest(w http.ResponseWriter, r *http.Request) {
	tankID, err := strconv.ParseInt(chi.URLParam(r, "tankId"), 10, 64)
	if err != nil || tankID <= 0 {
		writeError(w, 400, "invalid tank id")
		return
	}
	param, err := h.db.GetLatestWaterParam(tankID)
	if err != nil {
		writeJSON(w, 200, nil)
		return
	}
	writeJSON(w, 200, param)
}

func (h *ParamHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, 400, "invalid param id")
		return
	}
	if err := h.db.DeleteWaterParam(id); err != nil {
		writeError(w, 500, "failed to delete param")
		return
	}
	w.WriteHeader(204)
}

type ParamRangeHandler struct {
	db interface {
		ListParamRanges() ([]models.ParamRange, error)
		GetParamRange(string) (*models.ParamRange, error)
		UpdateParamRange(*models.ParamRange) error
	}
}

func NewParamRangeHandler(db interface {
	ListParamRanges() ([]models.ParamRange, error)
	GetParamRange(string) (*models.ParamRange, error)
	UpdateParamRange(*models.ParamRange) error
}) *ParamRangeHandler {
	return &ParamRangeHandler{db: db}
}

func (h *ParamRangeHandler) List(w http.ResponseWriter, r *http.Request) {
	ranges, err := h.db.ListParamRanges()
	if err != nil {
		writeError(w, 500, "failed to list param ranges")
		return
	}
	if ranges == nil {
		ranges = []models.ParamRange{}
	}
	writeJSON(w, 200, ranges)
}

func (h *ParamRangeHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req models.ParamRange
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	if err := h.db.UpdateParamRange(&req); err != nil {
		writeError(w, 500, "failed to update param range")
		return
	}
	writeJSON(w, 200, req)
}
