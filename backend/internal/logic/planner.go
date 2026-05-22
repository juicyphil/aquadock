package logic

import (
	"fmt"
	"time"
)

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

func MustParseRecurrence(r string) time.Duration {
	d, _ := parseRecurrence(r)
	return d
}

func ComputeOccurrences(startDate time.Time, recurrence string, rangeStart, rangeEnd time.Time) []time.Time {
	dur := MustParseRecurrence(recurrence)
	if dur == 0 {
		return nil
	}

	var dates []time.Time
	for d := startDate; !d.After(rangeEnd); d = d.Add(dur) {
		if !d.Before(rangeStart) {
			dates = append(dates, d)
		}
	}
	return dates
}
