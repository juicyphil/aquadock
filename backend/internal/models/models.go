package models

import "time"

type Tank struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Emoji     string    `json:"emoji"`
	Gallons   float64   `json:"gallons"`
	Type      string    `json:"type"`
	Subtype   string    `json:"subtype"`
	SetupDate string    `json:"setup_date"`
	FilterType string   `json:"filter_type"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
}

type TankCreate struct {
	Name       string  `json:"name"`
	Emoji      string  `json:"emoji"`
	Gallons    float64 `json:"gallons"`
	Type       string  `json:"type"`
	Subtype    string  `json:"subtype"`
	SetupDate  string  `json:"setup_date"`
	FilterType string  `json:"filter_type"`
	Notes      string  `json:"notes"`
}

type TankUpdate struct {
	Name       *string  `json:"name"`
	Emoji      *string  `json:"emoji"`
	Gallons    *float64 `json:"gallons"`
	Type       *string  `json:"type"`
	Subtype    *string  `json:"subtype"`
	SetupDate  *string  `json:"setup_date"`
	FilterType *string  `json:"filter_type"`
	Notes      *string  `json:"notes"`
}

type Inhabitant struct {
	ID        int64     `json:"id"`
	TankID    int64     `json:"tank_id"`
	Name      string    `json:"name"`
	Species   string    `json:"species"`
	Count     int       `json:"count"`
	Emoji     string    `json:"emoji"`
	AddedDate string    `json:"added_date"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
}

type InhabitantCreate struct {
	TankID    int64  `json:"tank_id"`
	Name      string `json:"name"`
	Species   string `json:"species"`
	Count     int    `json:"count"`
	Emoji     string `json:"emoji"`
	AddedDate string `json:"added_date"`
	Notes     string `json:"notes"`
}

type Event struct {
	ID            int64      `json:"id"`
	TankID        int64      `json:"tank_id"`
	Type          string     `json:"type"`
	Title         string     `json:"title"`
	ScheduledDate string     `json:"scheduled_date"`
	ScheduledTime string     `json:"scheduled_time"`
	Recurrence    string     `json:"recurrence"`
	CompletedAt   *string    `json:"completed_at"`
	Note          string     `json:"note"`
	CreatedAt     time.Time  `json:"created_at"`
}

type EventCreate struct {
	TankID        int64  `json:"tank_id"`
	Type          string `json:"type"`
	Title         string `json:"title"`
	ScheduledDate string `json:"scheduled_date"`
	ScheduledTime string `json:"scheduled_time"`
	Recurrence    string `json:"recurrence"`
	Note          string `json:"note"`
}

type WaterParam struct {
	ID          int64     `json:"id"`
	TankID      int64     `json:"tank_id"`
	TestedAt    string    `json:"tested_at"`
	Ammonia     *float64  `json:"ammonia"`
	Nitrite     *float64  `json:"nitrite"`
	Nitrate     *float64  `json:"nitrate"`
	Ph          *float64  `json:"ph"`
	Temperature *float64  `json:"temperature"`
	Gh          *float64  `json:"gh"`
	Kh          *float64  `json:"kh"`
	Notes       string    `json:"notes"`
}

type WaterParamCreate struct {
	TankID      int64    `json:"tank_id"`
	TestedAt    string   `json:"tested_at"`
	Ammonia     *float64 `json:"ammonia"`
	Nitrite     *float64 `json:"nitrite"`
	Nitrate     *float64 `json:"nitrate"`
	Ph          *float64 `json:"ph"`
	Temperature *float64 `json:"temperature"`
	Gh          *float64 `json:"gh"`
	Kh          *float64 `json:"kh"`
	Notes       string   `json:"notes"`
}

type ParamRange struct {
	ID           int64   `json:"id"`
	TankSubtype  string  `json:"tank_subtype"`
	AmmoniaMin   *float64 `json:"ammonia_min"`
	AmmoniaMax   *float64 `json:"ammonia_max"`
	NitriteMin   *float64 `json:"nitrite_min"`
	NitriteMax   *float64 `json:"nitrite_max"`
	NitrateMin   *float64 `json:"nitrate_min"`
	NitrateMax   *float64 `json:"nitrate_max"`
	PhMin        *float64 `json:"ph_min"`
	PhMax        *float64 `json:"ph_max"`
	TempMin      *float64 `json:"temp_min"`
	TempMax      *float64 `json:"temp_max"`
	GhMin        *float64 `json:"gh_min"`
	GhMax        *float64 `json:"gh_max"`
	KhMin        *float64 `json:"kh_min"`
	KhMax        *float64 `json:"kh_max"`
}

type DashboardTank struct {
	Tank
	InhabitantCount int           `json:"inhabitant_count"`
	PendingEvents   int           `json:"pending_events"`
	LatestParams    *WaterParam   `json:"latest_params"`
	OverdueEvents   int           `json:"overdue_events"`
}

type DashboardResponse struct {
	Tanks       []DashboardTank `json:"tanks"`
	TodayCount  int             `json:"today_count"`
	OverdueCount int            `json:"overdue_count"`
}

type PlannerDay struct {
	Date   string  `json:"date"`
	Events []Event `json:"events"`
}

type User struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type UserCreate struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
