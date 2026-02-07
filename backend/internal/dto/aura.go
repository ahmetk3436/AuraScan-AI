package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateAuraRequest defines the request body for aura scan
type CreateAuraRequest struct {
	ImageURL  string `json:"image_url"`
	ImageData string `json:"image_data"`
}

// AuraReadingResponse defines the response for an aura reading
type AuraReadingResponse struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	AuraColor      string     `json:"aura_color"`
	SecondaryColor *string    `json:"secondary_color,omitempty"`
	EnergyLevel    int        `json:"energy_level"`
	MoodScore      int        `json:"mood_score"`
	Personality    string     `json:"personality"`
	Strengths      []string   `json:"strengths"`
	Challenges     []string   `json:"challenges"`
	DailyAdvice    string     `json:"daily_advice"`
	ImageURL       string     `json:"image_url"`
	AnalyzedAt     time.Time  `json:"analyzed_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

// AuraListResponse defines the paginated list of aura readings
type AuraListResponse struct {
	Data       []AuraReadingResponse `json:"data"`
	Page       int                   `json:"page"`
	PageSize   int                   `json:"page_size"`
	TotalCount int64                 `json:"total_count"`
}

// AuraStatsResponse defines the aggregated stats for aura readings
type AuraStatsResponse struct {
	ColorDistribution map[string]int `json:"color_distribution"`
	TotalReadings     int64          `json:"total_readings"`
	AverageEnergy     float64        `json:"average_energy"`
	AverageMood       float64        `json:"average_mood"`
}

// ScanEligibilityResponse defines the response structure for scan eligibility checks
type ScanEligibilityResponse struct {
	CanScan      bool `json:"canScan"`
	Remaining    int  `json:"remaining"`
	IsSubscribed bool `json:"isSubscribed"`
}
