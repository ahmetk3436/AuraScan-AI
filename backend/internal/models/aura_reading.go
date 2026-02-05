package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuraReading struct {
	ID             uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	UserID         uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	ImageURL       string         `gorm:"type:text;not null" json:"image_url"`
	AuraColor      string         `gorm:"type:varchar(50);not null" json:"aura_color"`
	SecondaryColor *string        `gorm:"type:varchar(50);default:NULL" json:"secondary_color,omitempty"`
	EnergyLevel    int            `gorm:"type:integer;check:energy_level >= 1 AND energy_level <= 100" json:"energy_level"`
	MoodScore      int            `gorm:"type:integer;check:mood_score >= 1 AND mood_score <= 10" json:"mood_score"`
	Personality    string         `gorm:"type:text" json:"personality"`
	Strengths      []string       `gorm:"type:jsonb" json:"strengths"`
	Challenges     []string       `gorm:"type:jsonb" json:"challenges"`
	DailyAdvice    string         `gorm:"type:text" json:"daily_advice"`
	AnalyzedAt     time.Time      `gorm:"not null" json:"analyzed_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (AuraReading) TableName() string {
	return "aura_readings"
}