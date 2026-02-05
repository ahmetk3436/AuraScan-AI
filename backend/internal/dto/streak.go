package dto

import (
	"time"

	"github.com/google/uuid"
)

type StreakResponse struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"user_id"`
	CurrentStreak   int       `json:"current_streak"`
	LongestStreak   int       `json:"longest_streak"`
	TotalScans      int       `json:"total_scans"`
	LastScanDate    time.Time `json:"last_scan_date"`
	UnlockedColors  []string  `json:"unlocked_colors"`
	NextUnlock      string    `json:"next_unlock,omitempty"`
	DaysUntilUnlock int       `json:"days_until_unlock,omitempty"`
}

type StreakUpdateResponse struct {
	Streak       StreakResponse `json:"streak"`
	NewUnlock    string         `json:"new_unlock,omitempty"`
	StreakBroken bool           `json:"streak_broken"`
	Message      string         `json:"message"`
}
