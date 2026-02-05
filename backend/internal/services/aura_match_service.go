package services

import (
	"errors"
	"fmt"
	"math/rand"

	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuraMatchService struct {
	db *gorm.DB
}

func NewAuraMatchService(db *gorm.DB) *AuraMatchService {
	return &AuraMatchService{db: db}
}

// Complementary color pairs for high compatibility
var complementaryColors = map[string]string{
	"red":    "green",
	"green":  "red",
	"blue":   "orange",
	"orange": "blue",
	"yellow": "violet",
	"violet": "yellow",
	"indigo": "gold",
	"gold":   "indigo",
	"pink":   "white",
	"white":  "pink",
}

// Synergy messages based on color combinations
var synergyMessages = map[string]string{
	"same":          "You share a deep soul connection! Your energies resonate on the same frequency.",
	"complementary": "Your energies perfectly balance each other. What one lacks, the other provides.",
	"neutral":       "Your auras have a harmonious blend, creating a stable and grounded connection.",
	"challenging":   "Your energies create exciting tension - you push each other to grow.",
}

var tensionMessages = map[string]string{
	"same":          "Too much similarity can lead to stagnation. Seek new experiences together.",
	"complementary": "Your differences may sometimes cause misunderstandings. Communicate openly.",
	"neutral":       "Neither of you may feel deeply challenged. Actively inspire each other.",
	"challenging":   "Conflicting energies require patience and understanding to navigate.",
}

var adviceMessages = map[string]string{
	"same":          "Celebrate your similarities while exploring new territories together.",
	"complementary": "Embrace your differences as gifts. Learn from each other's strengths.",
	"neutral":       "Build intentional rituals to deepen your connection over time.",
	"challenging":   "Practice patience and active listening. Your growth potential is immense.",
}

func (s *AuraMatchService) calculateCompatibility(userColor, friendColor string) (int, string) {
	// Same color = 85-100%
	if userColor == friendColor {
		return 85 + rand.Intn(16), "same"
	}

	// Complementary colors = 70-90%
	if complementaryColors[userColor] == friendColor {
		return 70 + rand.Intn(21), "complementary"
	}

	// Check if colors are "challenging" (similar energy types)
	challengingPairs := map[string][]string{
		"red":    {"orange", "gold"},
		"blue":   {"indigo", "violet"},
		"green":  {"pink", "white"},
		"yellow": {"orange", "gold"},
	}

	for color, challengers := range challengingPairs {
		if userColor == color {
			for _, c := range challengers {
				if friendColor == c {
					return 30 + rand.Intn(31), "challenging"
				}
			}
		}
	}

	// Neutral = 50-75%
	return 50 + rand.Intn(26), "neutral"
}

func (s *AuraMatchService) Create(userID uuid.UUID, req dto.CreateMatchRequest) (*dto.AuraMatchResponse, error) {
	friendID, err := uuid.Parse(req.FriendID)
	if err != nil {
		return nil, errors.New("invalid friend ID")
	}

	if userID == friendID {
		return nil, errors.New("cannot match with yourself")
	}

	// Get user's latest aura
	var userAura models.AuraReading
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").First(&userAura).Error; err != nil {
		return nil, errors.New("you need an aura reading first")
	}

	// Get friend's latest aura
	var friendAura models.AuraReading
	if err := s.db.Where("user_id = ?", friendID).Order("created_at DESC").First(&friendAura).Error; err != nil {
		return nil, errors.New("friend doesn't have an aura reading yet")
	}

	// Calculate compatibility
	score, matchType := s.calculateCompatibility(userAura.AuraColor, friendAura.AuraColor)

	match := &models.AuraMatch{
		UserID:             userID,
		FriendID:           friendID,
		UserAuraID:         userAura.ID,
		FriendAuraID:       friendAura.ID,
		CompatibilityScore: score,
		Synergy:            fmt.Sprintf("%s Your %s aura meets their %s energy. %s", synergyMessages[matchType], userAura.AuraColor, friendAura.AuraColor, getSynergyDetail(userAura.AuraColor, friendAura.AuraColor)),
		Tension:            tensionMessages[matchType],
		Advice:             adviceMessages[matchType],
	}

	if err := s.db.Create(match).Error; err != nil {
		return nil, err
	}

	return &dto.AuraMatchResponse{
		ID:                 match.ID,
		UserID:             match.UserID,
		FriendID:           match.FriendID,
		UserAuraID:         match.UserAuraID,
		FriendAuraID:       match.FriendAuraID,
		CompatibilityScore: match.CompatibilityScore,
		Synergy:            match.Synergy,
		Tension:            match.Tension,
		Advice:             match.Advice,
		UserAuraColor:      userAura.AuraColor,
		FriendAuraColor:    friendAura.AuraColor,
		CreatedAt:          match.CreatedAt,
	}, nil
}

func getSynergyDetail(color1, color2 string) string {
	details := map[string]string{
		"red":    "Passion ignites.",
		"orange": "Creativity sparks.",
		"yellow": "Ideas flow.",
		"green":  "Growth flourishes.",
		"blue":   "Trust deepens.",
		"indigo": "Intuition guides.",
		"violet": "Magic happens.",
		"white":  "Purity shines.",
		"gold":   "Abundance attracts.",
		"pink":   "Love blooms.",
	}
	return fmt.Sprintf("%s %s", details[color1], details[color2])
}

func (s *AuraMatchService) List(userID uuid.UUID) ([]dto.AuraMatchResponse, error) {
	var matches []models.AuraMatch
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&matches).Error; err != nil {
		return nil, err
	}

	responses := make([]dto.AuraMatchResponse, len(matches))
	for i, m := range matches {
		// Get aura colors
		var userAura, friendAura models.AuraReading
		s.db.First(&userAura, "id = ?", m.UserAuraID)
		s.db.First(&friendAura, "id = ?", m.FriendAuraID)

		responses[i] = dto.AuraMatchResponse{
			ID:                 m.ID,
			UserID:             m.UserID,
			FriendID:           m.FriendID,
			UserAuraID:         m.UserAuraID,
			FriendAuraID:       m.FriendAuraID,
			CompatibilityScore: m.CompatibilityScore,
			Synergy:            m.Synergy,
			Tension:            m.Tension,
			Advice:             m.Advice,
			UserAuraColor:      userAura.AuraColor,
			FriendAuraColor:    friendAura.AuraColor,
			CreatedAt:          m.CreatedAt,
		}
	}

	return responses, nil
}

func (s *AuraMatchService) GetByFriend(userID, friendID uuid.UUID) (*dto.AuraMatchResponse, error) {
	var match models.AuraMatch
	if err := s.db.Where("user_id = ? AND friend_id = ?", userID, friendID).
		Order("created_at DESC").First(&match).Error; err != nil {
		return nil, err
	}

	var userAura, friendAura models.AuraReading
	s.db.First(&userAura, "id = ?", match.UserAuraID)
	s.db.First(&friendAura, "id = ?", match.FriendAuraID)

	return &dto.AuraMatchResponse{
		ID:                 match.ID,
		UserID:             match.UserID,
		FriendID:           match.FriendID,
		UserAuraID:         match.UserAuraID,
		FriendAuraID:       match.FriendAuraID,
		CompatibilityScore: match.CompatibilityScore,
		Synergy:            match.Synergy,
		Tension:            match.Tension,
		Advice:             match.Advice,
		UserAuraColor:      userAura.AuraColor,
		FriendAuraColor:    friendAura.AuraColor,
		CreatedAt:          match.CreatedAt,
	}, nil
}
