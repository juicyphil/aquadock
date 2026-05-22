package handlers

import (
	"encoding/json"
	"log"
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
		ListAllEvents() ([]models.Event, error)
		ListEventsByDate(string) ([]models.Event, error)
		ListEventsByTank(int64, int) ([]models.Event, error)
		ListOverdueEvents() ([]models.Event, error)
		ListPendingEventsByDateRange(string, string) ([]models.Event, error)
		ListUpcomingEvents(int64, int) ([]models.Event, error)
		UpdateEvent(int64, *models.EventUpdate) (*models.Event, error)
		CompleteEvent(int64) error
		CompleteEventInstance(int64, string) error
		SkipEventInstance(int64, string) error
		ListCompletionsByEvent(int64) (map[string]bool, error)
		ListSkipsByEvent(int64) (map[string]bool, error)
		UpdateEventDate(int64, string, string) error
		DeleteEvent(int64) error
	}
}

func NewEventHandler(db interface {
	CreateEvent(*models.EventCreate) (*models.Event, error)
	GetEvent(int64) (*models.Event, error)
	ListAllEvents() ([]models.Event, error)
	ListEventsByDate(string) ([]models.Event, error)
	ListEventsByTank(int64, int) ([]models.Event, error)
	ListOverdueEvents() ([]models.Event, error)
	ListPendingEventsByDateRange(string, string) ([]models.Event, error)
	ListUpcomingEvents(int64, int) ([]models.Event, error)
	UpdateEvent(int64, *models.EventUpdate) (*models.Event, error)
	CompleteEvent(int64) error
	CompleteEventInstance(int64, string) error
	SkipEventInstance(int64, string) error
	ListCompletionsByEvent(int64) (map[string]bool, error)
	ListSkipsByEvent(int64) (map[string]bool, error)
	UpdateEventDate(int64, string, string) error
	DeleteEvent(int64) error
}) *EventHandler {
	return &EventHandler{db: db}
}

func (h *EventHandler) expandRecurring(event models.Event, rangeStart, rangeEnd string, completions, skips map[string]bool) []models.EventOccurrence {
	start, err := time.Parse("2006-01-02", event.ScheduledDate)
	if err != nil {
		return nil
	}
	rs, err := time.Parse("2006-01-02", rangeStart)
	if err != nil {
		return nil
	}
	re, err := time.Parse("2006-01-02", rangeEnd)
	if err != nil {
		return nil
	}

	dates := logic.ComputeOccurrences(start, event.Recurrence, rs, re)
	var result []models.EventOccurrence
	for _, d := range dates {
		dateStr := d.Format("2006-01-02")
		if skips[dateStr] {
			continue
		}
		eo := models.EventOccurrence{
			Event:          event,
			OccurrenceDate: dateStr,
			Completed:      completions[dateStr],
		}
		result = append(result, eo)
	}
	return result
}

func (h *EventHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.EventCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	if req.ScheduledDate == "" {
		req.ScheduledDate = time.Now().UTC().Format("2006-01-02")
	}
	if req.Title == "" {
		req.Title = req.Type
	}

	event, err := h.db.CreateEvent(&req)
	if err != nil {
		writeError(w, 500, "failed to create event")
		return
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
		date = time.Now().UTC().Format("2006-01-02")
	}

	events, err := h.db.ListEventsByDate(date)
	if err != nil {
		writeError(w, 500, "failed to list events")
		return
	}

	var occurrences []models.EventOccurrence
	for _, e := range events {
		if e.Recurrence == "" {
			occurrences = append(occurrences, models.EventOccurrence{
				Event:          e,
				OccurrenceDate: e.ScheduledDate,
				Completed:      e.CompletedAt != nil,
			})
		} else {
			completions, _ := h.db.ListCompletionsByEvent(e.ID)
			skips, _ := h.db.ListSkipsByEvent(e.ID)
			expanded := h.expandRecurring(e, date, date, completions, skips)
			occurrences = append(occurrences, expanded...)
		}
	}

	if occurrences == nil {
		occurrences = []models.EventOccurrence{}
	}
	writeJSON(w, 200, occurrences)
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

	var occurrences []models.EventOccurrence
	for _, e := range events {
		if e.Recurrence == "" {
			occurrences = append(occurrences, models.EventOccurrence{
				Event:          e,
				OccurrenceDate: e.ScheduledDate,
				Completed:      e.CompletedAt != nil,
			})
		} else {
			completions, _ := h.db.ListCompletionsByEvent(e.ID)
			skips, _ := h.db.ListSkipsByEvent(e.ID)
			expanded := h.expandRecurring(e, start, end, completions, skips)
			occurrences = append(occurrences, expanded...)
		}
	}

	if occurrences == nil {
		occurrences = []models.EventOccurrence{}
	}
	writeJSON(w, 200, occurrences)
}

func (h *EventHandler) ListUpcoming(w http.ResponseWriter, r *http.Request) {
	tankID, _ := strconv.ParseInt(chi.URLParam(r, "tankId"), 10, 64)
	limitStr := r.URL.Query().Get("limit")
	limit := 5
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}
	events, err := h.db.ListUpcomingEvents(tankID, limit)
	if err != nil {
		writeError(w, 500, "failed to list upcoming events")
		return
	}
	if events == nil {
		events = []models.Event{}
	}
	writeJSON(w, 200, events)
}

func (h *EventHandler) ListOverdue(w http.ResponseWriter, r *http.Request) {
	today := time.Now().UTC().Format("2006-01-02")

	events, err := h.db.ListOverdueEvents()
	if err != nil {
		writeError(w, 500, "failed to list overdue events")
		return
	}

	var occurrences []models.EventOccurrence
	for _, e := range events {
		if e.Recurrence == "" {
			if e.CompletedAt == nil {
				occurrences = append(occurrences, models.EventOccurrence{
					Event:          e,
					OccurrenceDate: e.ScheduledDate,
					Completed:      false,
				})
			}
		} else {
			completions, _ := h.db.ListCompletionsByEvent(e.ID)
			skips, _ := h.db.ListSkipsByEvent(e.ID)
			expanded := h.expandRecurring(e, e.ScheduledDate, today, completions, skips)
			for _, o := range expanded {
				if !o.Completed {
					occurrences = append(occurrences, o)
				}
			}
		}
	}

	if occurrences == nil {
		occurrences = []models.EventOccurrence{}
	}
	writeJSON(w, 200, occurrences)
}

func (h *EventHandler) Complete(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)

	event, err := h.db.GetEvent(id)
	if err != nil {
		writeError(w, 404, "event not found")
		return
	}

	var req struct {
		Date string `json:"date"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if event.Recurrence != "" && req.Date != "" {
		if err := h.db.CompleteEventInstance(id, req.Date); err != nil {
			log.Printf("complete instance: %v", err)
			writeError(w, 500, "failed to complete event")
			return
		}
	} else {
		if err := h.db.CompleteEvent(id); err != nil {
			writeError(w, 500, "failed to complete event")
			return
		}
	}

	writeJSON(w, 200, map[string]string{"status": "completed"})
}

func (h *EventHandler) Skip(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)

	event, err := h.db.GetEvent(id)
	if err != nil {
		writeError(w, 404, "event not found")
		return
	}

	var req struct {
		Date string `json:"date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Date == "" {
		writeError(w, 400, "date is required")
		return
	}

	if event.Recurrence == "" {
		if err := h.db.DeleteEvent(id); err != nil {
			writeError(w, 500, "failed to delete event")
			return
		}
	} else {
		if err := h.db.SkipEventInstance(id, req.Date); err != nil {
			writeError(w, 500, "failed to skip event")
			return
		}
	}

	writeJSON(w, 200, map[string]string{"status": "skipped"})
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

func (h *EventHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req models.EventUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	event, err := h.db.UpdateEvent(id, &req)
	if err != nil {
		writeError(w, 500, "failed to update event")
		return
	}
	writeJSON(w, 200, event)
}

func (h *EventHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, 400, "invalid event id")
		return
	}
	if err := h.db.DeleteEvent(id); err != nil {
		writeError(w, 500, "failed to delete event")
		return
	}
	w.WriteHeader(204)
}
