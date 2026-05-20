package logic

import (
	"aquadock/internal/models"
	"fmt"
	"time"
)

const eventHorizon = 90

func GenerateRecurringEvents(db interface {
	CreateEvent(*models.EventCreate) (*models.Event, error)
	ListEventsByDate(string) ([]models.Event, error)
}, tankID int64, eventType string, title string, recurrence string, fromDate string, note string) error {
	dur, err := parseRecurrence(recurrence)
	if err != nil {
		return err
	}

	start, err := time.Parse("2006-01-02", fromDate)
	if err != nil {
		return fmt.Errorf("parse start date: %w", err)
	}

	horizon := start.AddDate(0, 0, eventHorizon)
	existing, err := db.ListEventsByDate(fromDate)
	if err != nil {
		return err
	}
	existingMap := make(map[string]bool)
	for _, e := range existing {
		if e.TankID == tankID && e.Type == eventType && e.Recurrence != "" {
			existingMap[e.ScheduledDate] = true
		}
	}

	for d := start; !d.After(horizon); d = d.Add(dur) {
		dateStr := d.Format("2006-01-02")
		if existingMap[dateStr] {
			continue
		}
		_, err := db.CreateEvent(&models.EventCreate{
			TankID:        tankID,
			Type:          eventType,
			Title:         title,
			ScheduledDate: dateStr,
			Recurrence:    recurrence,
		})
		if err != nil {
			return fmt.Errorf("generate event for %s: %w", dateStr, err)
		}
	}
	return nil
}

func parseRecurrence(r string) (time.Duration, error) {
	switch r {
	case "1d":
		return 24 * time.Hour, nil
	case "2d":
		return 48 * time.Hour, nil
	case "3d":
		return 72 * time.Hour, nil
	case "7d":
		return 7 * 24 * time.Hour, nil
	case "14d":
		return 14 * 24 * time.Hour, nil
	case "30d":
		return 30 * 24 * time.Hour, nil
	default:
		return 0, fmt.Errorf("unknown recurrence: %s", r)
	}
}

func NextRecurrenceDate(current string, recurrence string) (string, error) {
	dur, err := parseRecurrence(recurrence)
	if err != nil {
		return "", err
	}
	t, err := time.Parse("2006-01-02", current)
	if err != nil {
		return "", fmt.Errorf("parse date: %w", err)
	}
	return t.Add(dur).Format("2006-01-02"), nil
}
