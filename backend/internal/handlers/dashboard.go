package handlers

import (
	"net/http"
	"time"

	"aquadock/internal/models"
)

type DashboardHandler struct {
	db interface {
		ListTanks() ([]models.Tank, error)
		ListInhabitants(int64) ([]models.Inhabitant, error)
		ListEventsByDate(string) ([]models.Event, error)
		ListOverdueEvents() ([]models.Event, error)
		GetLatestWaterParam(int64) (*models.WaterParam, error)
	}
}

func NewDashboardHandler(db interface {
	ListTanks() ([]models.Tank, error)
	ListInhabitants(int64) ([]models.Inhabitant, error)
	ListEventsByDate(string) ([]models.Event, error)
	ListOverdueEvents() ([]models.Event, error)
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

	today := time.Now().Format("2006-01-02")
	todayEvents, _ := h.db.ListEventsByDate(today)
	overdueEvents, _ := h.db.ListOverdueEvents()

	resp := models.DashboardResponse{
		Tanks:       []models.DashboardTank{},
		TodayCount:  len(todayEvents),
		OverdueCount: len(overdueEvents),
	}

	for _, tank := range tanks {
		inhabs, _ := h.db.ListInhabitants(tank.ID)
		latestParam, _ := h.db.GetLatestWaterParam(tank.ID)

		pendingCount := 0
		for _, e := range todayEvents {
			if e.TankID == tank.ID && e.CompletedAt == nil {
				pendingCount++
			}
		}
		overdueCount := 0
		for _, e := range overdueEvents {
			if e.TankID == tank.ID {
				overdueCount++
			}
		}

		resp.Tanks = append(resp.Tanks, models.DashboardTank{
			Tank:            tank,
			InhabitantCount: len(inhabs),
			PendingEvents:   pendingCount,
			LatestParams:    latestParam,
			OverdueEvents:   overdueCount,
		})
	}

	writeJSON(w, 200, resp)
}
