package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateAuraRequest struct {
	ImageURL string `json:"image_url" validate:"required,url"`
}

type AuraResponse struct {
	ID             uuid.UUID  `json:"id"`
	ImageURL       string     `json:"image_url"`
	AuraColor      string     `json:"aura_color"`
	SecondaryColor *string    `json:"secondary_color,omitempty"`
	EnergyLevel    int        `json:"energy_level"`
	MoodScore      int        `json:"mood_score"`
	Personality    string     `json:"personality"`
	Strengths      []string   `json:"strengths"`
	Challenges     []string   `json:"challenges"`
	DailyAdvice    string     `json:"daily_advice"`
	AnalyzedAt     time.Time  `json:"analyzed_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

type PaginatedAuraResponse struct {
	Data       []AuraResponse `json:"data"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	PageSize   int            `json:"page_size"`
	TotalPages int            `json:"total_pages"`
}

type AuraStatsResponse struct {
	ColorDistribution map[string]int `json:"color_distribution"`
	TotalReadings     int64          `json:"total_readings"`
	AverageEnergy     float64        `json:"average_energy"`
	AverageMood       float64        `json:"average_mood"`
}