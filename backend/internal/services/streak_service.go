package services

import (
	"fmt"
	"time"

	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StreakService struct {
	db *gorm.DB
}

func NewStreakService(db *gorm.DB) *StreakService {
	return &StreakService{db: db}
}

// Unlockable colors at specific streak milestones
var streakUnlocks = map[int]string{
	3:  "silver",   // 3-day streak
	7:  "gold",     // 7-day streak
	14: "white",    // 14-day streak
	21: "rainbow",  // 21-day streak
	30: "cosmic",   // 30-day streak
	50: "celestial", // 50-day streak
}

func (s *StreakService) GetOrCreate(userID uuid.UUID) (*models.AuraStreak, error) {
	var streak models.AuraStreak
	err := s.db.Where("user_id = ?", userID).First(&streak).Error

	if err == gorm.ErrRecordNotFound {
		streak = models.AuraStreak{
			UserID:         userID,
			CurrentStreak:  0,
			LongestStreak:  0,
			TotalScans:     0,
			UnlockedColors: []string{},
		}
		if err := s.db.Create(&streak).Error; err != nil {
			return nil, err
		}
		return &streak, nil
	}

	if err != nil {
		return nil, err
	}

	return &streak, nil
}

func (s *StreakService) Get(userID uuid.UUID) (*dto.StreakResponse, error) {
	streak, err := s.GetOrCreate(userID)
	if err != nil {
		return nil, err
	}

	response := &dto.StreakResponse{
		ID:             streak.ID,
		UserID:         streak.UserID,
		CurrentStreak:  streak.CurrentStreak,
		LongestStreak:  streak.LongestStreak,
		TotalScans:     streak.TotalScans,
		LastScanDate:   streak.LastScanDate,
		UnlockedColors: streak.UnlockedColors,
	}

	// Calculate next unlock
	for days, color := range streakUnlocks {
		if streak.CurrentStreak < days {
			response.NextUnlock = color
			response.DaysUntilUnlock = days - streak.CurrentStreak
			break
		}
	}

	return response, nil
}

func (s *StreakService) Update(userID uuid.UUID) (*dto.StreakUpdateResponse, error) {
	streak, err := s.GetOrCreate(userID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	lastScan := time.Date(streak.LastScanDate.Year(), streak.LastScanDate.Month(), streak.LastScanDate.Day(), 0, 0, 0, 0, streak.LastScanDate.Location())

	streakBroken := false
	message := ""
	var newUnlock string

	// Already scanned today
	if !streak.LastScanDate.IsZero() && lastScan.Equal(today) {
		message = "You've already scanned today! Come back tomorrow."
		return &dto.StreakUpdateResponse{
			Streak: dto.StreakResponse{
				ID:             streak.ID,
				UserID:         streak.UserID,
				CurrentStreak:  streak.CurrentStreak,
				LongestStreak:  streak.LongestStreak,
				TotalScans:     streak.TotalScans,
				LastScanDate:   streak.LastScanDate,
				UnlockedColors: streak.UnlockedColors,
			},
			StreakBroken: false,
			Message:      message,
		}, nil
	}

	yesterday := today.AddDate(0, 0, -1)

	// Calculate new streak
	if streak.LastScanDate.IsZero() {
		// First scan ever
		streak.CurrentStreak = 1
		message = "🔥 Your aura journey begins! Day 1 streak started."
	} else if lastScan.Equal(yesterday) {
		// Consecutive day - streak continues
		streak.CurrentStreak++
		message = "🔥 Amazing! " + formatStreakMessage(streak.CurrentStreak)
	} else {
		// Streak broken (more than 1 day gap)
		if streak.CurrentStreak > 0 {
			streakBroken = true
			message = "💫 New beginning! Your previous streak was " + formatDays(streak.CurrentStreak) + ". Let's start fresh!"
		} else {
			message = "🔥 Your aura journey begins!"
		}
		streak.CurrentStreak = 1
	}

	// Update longest streak
	if streak.CurrentStreak > streak.LongestStreak {
		streak.LongestStreak = streak.CurrentStreak
	}

	// Increment total scans
	streak.TotalScans++
	streak.LastScanDate = now

	// Check for new unlocks
	for days, color := range streakUnlocks {
		if streak.CurrentStreak == days {
			newUnlock = color
			if !contains(streak.UnlockedColors, color) {
				streak.UnlockedColors = append(streak.UnlockedColors, color)
				message = "🎉 " + message + " You unlocked the " + color + " aura!"
			}
			break
		}
	}

	if err := s.db.Save(streak).Error; err != nil {
		return nil, err
	}

	response := &dto.StreakUpdateResponse{
		Streak: dto.StreakResponse{
			ID:             streak.ID,
			UserID:         streak.UserID,
			CurrentStreak:  streak.CurrentStreak,
			LongestStreak:  streak.LongestStreak,
			TotalScans:     streak.TotalScans,
			LastScanDate:   streak.LastScanDate,
			UnlockedColors: streak.UnlockedColors,
		},
		NewUnlock:    newUnlock,
		StreakBroken: streakBroken,
		Message:      message,
	}

	// Add next unlock info
	for days, color := range streakUnlocks {
		if streak.CurrentStreak < days {
			response.Streak.NextUnlock = color
			response.Streak.DaysUntilUnlock = days - streak.CurrentStreak
			break
		}
	}

	return response, nil
}

func formatStreakMessage(days int) string {
	if days == 7 {
		return "1 week streak! You're on fire! 🔥"
	} else if days == 14 {
		return "2 weeks strong! Incredible dedication! ⭐"
	} else if days == 21 {
		return "3 weeks! You're a true aura master! 🌟"
	} else if days == 30 {
		return "30 days! Legendary status achieved! 👑"
	} else if days == 50 {
		return "50 days! You're absolutely cosmic! 🌌"
	}
	return formatDays(days) + " streak! Keep going!"
}

func formatDays(days int) string {
	if days == 1 {
		return "1 day"
	}
	return fmt.Sprintf("%d days", days)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
