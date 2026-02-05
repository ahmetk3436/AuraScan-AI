package models

import (
	"time"

	"github.com/google/uuid"
)

type AuraStreak struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	CurrentStreak  int       `gorm:"type:integer;default:0" json:"current_streak"`
	LongestStreak  int       `gorm:"type:integer;default:0" json:"longest_streak"`
	TotalScans     int       `gorm:"type:integer;default:0" json:"total_scans"`
	LastScanDate   time.Time `gorm:"type:date" json:"last_scan_date"`
	UnlockedColors []string  `gorm:"type:jsonb;default:'[]'" json:"unlocked_colors"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (AuraStreak) TableName() string {
	return "aura_streaks"
}
