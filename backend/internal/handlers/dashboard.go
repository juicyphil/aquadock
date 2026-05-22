package handlers

import (
	"net/http"
	"time"

	"aquadock/internal/logic"
	"aquadock/internal/models"
)

type DashboardHandler struct {
	db interface {
		ListTanks() ([]models.Tank, error)
		ListInhabitants(int64) ([]models.Inhabitant, error)
		ListAllEvents() ([]models.Event, error)
		ListCompletionsByEvent(int64) (map[string]bool, error)
		ListSkipsByEvent(int64) (map[string]bool, error)
		GetLatestWaterParam(int64) (*models.WaterParam, error)
	}
}

func NewDashboardHandler(db interface {
	ListTanks() ([]models.Tank, error)
	ListInhabitants(int64) ([]models.Inhabitant, error)
	ListAllEvents() ([]models.Event, error)
	ListCompletionsByEvent(int64) (map[string]bool, error)
	ListSkipsByEvent(int64) (map[string]bool, error)
	GetLatestWaterParam(int64) (*models.WaterParam, error)
}) *DashboardHandler {
	return &DashboardHandler{db: db}
}

func (h *DashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	tanks, err := h.db.ListTanks()
	if err != nil {
		writeError(w, 500, "failed to load dashboard")
		return
	}

	today := time.Now().UTC().Format("2006-01-02")
	allEvents, err := h.db.ListAllEvents()
	if err != nil {
		allEvents = []models.Event{}
	}

	todayCount := 0
	overdueCount := 0
	tankPending := make(map[int64]int)
	tankOverdue := make(map[int64]int)

	for _, e := range allEvents {
		if e.Recurrence == "" {
			if e.ScheduledDate == today && e.CompletedAt == nil {
				todayCount++
				tankPending[e.TankID]++
			}
			if e.ScheduledDate < today && e.CompletedAt == nil {
				overdueCount++
				tankOverdue[e.TankID]++
			}
		} else {
			start, err := time.Parse("2006-01-02", e.ScheduledDate)
			if err != nil {
				continue
			}
			todayT, _ := time.Parse("2006-01-02", today)
			completions, err := h.db.ListCompletionsByEvent(e.ID)
			if err != nil {
				completions = map[string]bool{}
			}
			skips, err := h.db.ListSkipsByEvent(e.ID)
			if err != nil {
				skips = map[string]bool{}
			}

			occurrences := logic.ComputeOccurrences(start, e.Recurrence, start, todayT)
			for _, d := range occurrences {
				dateStr := d.Format("2006-01-02")
				if skips[dateStr] {
					continue
				}
				if completions[dateStr] {
					continue
				}
				if dateStr == today {
					todayCount++
					tankPending[e.TankID]++
				} else if dateStr < today {
					overdueCount++
					tankOverdue[e.TankID]++
				}
			}
		}
	}

	resp := models.DashboardResponse{
		Tanks:        []models.DashboardTank{},
		TodayCount:   todayCount,
		OverdueCount: overdueCount,
	}

	for _, tank := range tanks {
		inhabs, err := h.db.ListInhabitants(tank.ID)
		if err != nil {
			inhabs = []models.Inhabitant{}
		}
		latestParam, err := h.db.GetLatestWaterParam(tank.ID)
		if err != nil {
			latestParam = nil
		}

		resp.Tanks = append(resp.Tanks, models.DashboardTank{
			Tank:            tank,
			InhabitantCount: len(inhabs),
			PendingEvents:   tankPending[tank.ID],
			LatestParams:    latestParam,
			OverdueEvents:   tankOverdue[tank.ID],
		})
	}

	writeJSON(w, 200, resp)
}
