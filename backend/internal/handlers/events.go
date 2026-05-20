package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"aquadock/internal/logic"
	"aquadock/internal/models"

	"github.com/go-chi/chi/v5"
)

type EventHandler struct {
	db interface {
		CreateEvent(*models.EventCreate) (*models.Event, error)
		GetEvent(int64) (*models.Event, error)
		ListEventsByDate(string) ([]models.Event, error)
		ListEventsByTank(int64, int) ([]models.Event, error)
		ListOverdueEvents() ([]models.Event, error)
		ListPendingEventsByDateRange(string, string) ([]models.Event, error)
		ListTodayPending() ([]models.Event, error)
		CompleteEvent(int64) error
		UpdateEventDate(int64, string, string) error
		DeleteEvent(int64) error
	}
}

func NewEventHandler(db interface {
	CreateEvent(*models.EventCreate) (*models.Event, error)
	GetEvent(int64) (*models.Event, error)
	ListEventsByDate(string) ([]models.Event, error)
	ListEventsByTank(int64, int) ([]models.Event, error)
	ListOverdueEvents() ([]models.Event, error)
	ListPendingEventsByDateRange(string, string) ([]models.Event, error)
	ListTodayPending() ([]models.Event, error)
	CompleteEvent(int64) error
	UpdateEventDate(int64, string, string) error
	DeleteEvent(int64) error
}) *EventHandler {
	return &EventHandler{db: db}
}

func (h *EventHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.EventCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	if req.ScheduledDate == "" {
		req.ScheduledDate = time.Now().Format("2006-01-02")
	}
	if req.Title == "" {
		req.Title = req.Type
	}

	event, err := h.db.CreateEvent(&req)
	if err != nil {
		writeError(w, 500, "failed to create event")
		return
	}

	if req.Recurrence != "" {
		go logic.GenerateRecurringEvents(h.db, req.TankID, req.Type, req.Title, req.Recurrence, req.ScheduledDate, req.Note)
	}

	writeJSON(w, 201, event)
}

func (h *EventHandler) ListByTank(w http.ResponseWriter, r *http.Request) {
	tankID, _ := strconv.ParseInt(chi.URLParam(r, "tankId"), 10, 64)
	events, err := h.db.ListEventsByTank(tankID, 50)
	if err != nil {
		writeError(w, 500, "failed to list events")
		return
	}
	if events == nil {
		events = []models.Event{}
	}
	writeJSON(w, 200, events)
}

func (h *EventHandler) ListByDate(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	events, err := h.db.ListEventsByDate(date)
	if err != nil {
		writeError(w, 500, "failed to list events")
		return
	}
	if events == nil {
		events = []models.Event{}
	}
	writeJSON(w, 200, events)
}

func (h *EventHandler) ListRange(w http.ResponseWriter, r *http.Request) {
	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")
	if start == "" || end == "" {
		writeError(w, 400, "start and end dates required")
		return
	}
	events, err := h.db.ListPendingEventsByDateRange(start, end)
	if err != nil {
		writeError(w, 500, "failed to list events")
		return
	}
	if events == nil {
		events = []models.Event{}
	}
	writeJSON(w, 200, events)
}

func (h *EventHandler) ListOverdue(w http.ResponseWriter, r *http.Request) {
	events, err := h.db.ListOverdueEvents()
	if err != nil {
		writeError(w, 500, "failed to list overdue events")
		return
	}
	if events == nil {
		events = []models.Event{}
	}
	writeJSON(w, 200, events)
}

func (h *EventHandler) Complete(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)

	event, err := h.db.GetEvent(id)
	if err != nil {
		writeError(w, 404, "event not found")
		return
	}

	if err := h.db.CompleteEvent(id); err != nil {
		writeError(w, 500, "failed to complete event")
		return
	}

	if event.Recurrence != "" {
		nextDate, err := logic.NextRecurrenceDate(event.ScheduledDate, event.Recurrence)
		if err == nil {
			h.db.CreateEvent(&models.EventCreate{
				TankID:        event.TankID,
				Type:          event.Type,
				Title:         event.Title,
				ScheduledDate: nextDate,
				Recurrence:    event.Recurrence,
				Note:          event.Note,
			})
		}
	}

	writeJSON(w, 200, map[string]string{"status": "completed"})
}

func (h *EventHandler) Reschedule(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Date string `json:"date"`
		Time string `json:"time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	if err := h.db.UpdateEventDate(id, req.Date, req.Time); err != nil {
		writeError(w, 500, "failed to reschedule event")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "rescheduled"})
}

func (h *EventHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.db.DeleteEvent(id); err != nil {
		writeError(w, 500, "failed to delete event")
		return
	}
	w.WriteHeader(204)
}
