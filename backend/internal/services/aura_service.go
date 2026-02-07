package services

import (
	"fmt"
	"time"

	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/config"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuraService handles business logic for Aura readings
type AuraService struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewAuraService creates a new AuraService instance
func NewAuraService(db *gorm.DB, cfg *config.Config) *AuraService {
	return &AuraService{db: db, cfg: cfg}
}

// GetTodayCount counts the number of scans performed by a user today (UTC)
func (s *AuraService) GetTodayCount(userID uuid.UUID) (int64, error) {
	var count int64

	now := time.Now().UTC()
	startOfDay := now.Truncate(24 * time.Hour)
	endOfDay := startOfDay.Add(24 * time.Hour)

	err := s.db.Table("aura_readings").
		Where("user_id = ? AND created_at >= ? AND created_at < ?", userID, startOfDay, endOfDay).
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to get today's count: %w", err)
	}

	return count, nil
}

// CanScan determines if a user is eligible to scan based on subscription and daily limits
func (s *AuraService) CanScan(userID uuid.UUID, isSubscribed bool) (bool, int, error) {
	// Subscribed users have unlimited scans
	if isSubscribed {
		return true, -1, nil
	}

	count, err := s.GetTodayCount(userID)
	if err != nil {
		return false, 0, err
	}

	// Free users are limited to 2 scans per day
	if count < 2 {
		remaining := 2 - int(count)
		return true, remaining, nil
	}

	return false, 0, nil
}

// IsSubscribed checks if a user has an active subscription
func (s *AuraService) IsSubscribed(userID uuid.UUID) bool {
	var status string
	err := s.db.Table("subscriptions").
		Select("status").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(1).
		Scan(&status).Error
	return err == nil && status == "active"
}
