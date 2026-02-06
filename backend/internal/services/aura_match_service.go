package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuraMatchService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuraMatchService(db *gorm.DB, cfg *config.Config) *AuraMatchService {
	return &AuraMatchService{db: db, cfg: cfg}
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

// compatibilityAIResult represents the JSON structure returned by OpenAI for match analysis
type compatibilityAIResult struct {
	CompatibilityScore int    `json:"compatibility_score"`
	Synergy            string `json:"synergy"`
	Tension            string `json:"tension"`
	Advice             string `json:"advice"`
}

const matchSystemPrompt = `You are an aura compatibility analyst. You understand color theory, energy dynamics, and personality psychology as they relate to aura colors.

The AuraSnap aura color system includes these colors and their meanings:
- Red: Passionate, energetic, action-oriented. Strengths: courage, leadership. Challenges: impulsiveness.
- Orange: Creative, social, adventurous. Strengths: creativity, optimism. Challenges: scattered focus.
- Yellow: Optimistic, intellectual, cheerful. Strengths: analytical thinking, positivity. Challenges: overthinking.
- Green: Balanced, growth-oriented, nurturing. Strengths: compassion, reliability. Challenges: jealousy.
- Blue: Calm, intuitive, trustworthy. Strengths: communication, intuition. Challenges: fear of expression.
- Indigo: Intuitive, wise, spiritual. Strengths: vision, wisdom. Challenges: isolation.
- Violet: Visionary, artistic, magical. Strengths: imagination, humanitarianism. Challenges: unrealistic expectations.
- White: Pure, balanced, spiritually connected. Strengths: healing, high vibration. Challenges: vulnerability.
- Gold: Confident, abundant, empowered. Strengths: confidence, generosity. Challenges: ego.
- Pink: Loving, gentle, compassionate. Strengths: empathy, nurturing. Challenges: lack of boundaries.

Analyze the compatibility between two people based on their aura data. Consider:
1. Color theory: complementary colors (red-green, blue-orange, yellow-violet, indigo-gold, pink-white) have natural harmony.
2. Energy levels: similar energy levels indicate natural rhythm compatibility; large gaps may cause friction.
3. Mood alignment: similar mood scores suggest emotional resonance.
4. Personality traits: look for complementary strengths and overlapping challenges.

Return ONLY valid JSON with these exact fields:
- compatibility_score: integer 0-100 (0=incompatible, 50=neutral, 80+=highly compatible, 95+=soulmate level)
- synergy: 2-3 sentences describing the positive dynamics and strengths of this pairing
- tension: 1-2 sentences about potential friction points or growth areas
- advice: 1-2 sentences of practical relationship guidance for this specific pairing

Be specific and personal — reference the actual colors, traits, and energy levels provided. Do not give generic responses.`

func (s *AuraMatchService) calculateCompatibilityAI(userAura, friendAura models.AuraReading) (*compatibilityAIResult, error) {
	userPrompt := fmt.Sprintf(`Analyze compatibility between these two auras:

Person A:
- Aura Color: %s
- Energy Level: %d/100
- Mood Score: %d/10
- Personality: %s
- Strengths: %s
- Challenges: %s

Person B:
- Aura Color: %s
- Energy Level: %d/100
- Mood Score: %d/10
- Personality: %s
- Strengths: %s
- Challenges: %s`,
		userAura.AuraColor, userAura.EnergyLevel, userAura.MoodScore,
		userAura.Personality, strings.Join(userAura.Strengths, ", "), strings.Join(userAura.Challenges, ", "),
		friendAura.AuraColor, friendAura.EnergyLevel, friendAura.MoodScore,
		friendAura.Personality, strings.Join(friendAura.Strengths, ", "), strings.Join(friendAura.Challenges, ", "),
	)

	// Reuse the OpenAI request/response types defined in aura_service.go (same package)
	reqBody := openAIRequest{
		Model: "gpt-4o-mini",
		Messages: []openAIMessage{
			{Role: "system", Content: matchSystemPrompt},
			{Role: "user", Content: userPrompt},
		},
		MaxTokens:   300,
		Temperature: 0.7,
		ResponseFormat: &responseFormat{
			Type: "json_object",
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	client := &http.Client{Timeout: 30 * time.Second}

	httpReq, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.cfg.OpenAIAPIKey)

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OpenAI API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var openAIResp openAIResponse
	if err := json.Unmarshal(respBody, &openAIResp); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	if openAIResp.Error != nil {
		return nil, fmt.Errorf("OpenAI API error: %s", openAIResp.Error.Message)
	}

	if len(openAIResp.Choices) == 0 {
		return nil, fmt.Errorf("OpenAI returned no choices")
	}

	content := openAIResp.Choices[0].Message.Content

	var result compatibilityAIResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("failed to parse compatibility JSON: %w", err)
	}

	// Validate compatibility_score is 0-100
	if result.CompatibilityScore < 0 {
		result.CompatibilityScore = 0
	}
	if result.CompatibilityScore > 100 {
		result.CompatibilityScore = 100
	}

	// Validate non-empty text fields
	if strings.TrimSpace(result.Synergy) == "" {
		return nil, fmt.Errorf("AI returned empty synergy")
	}
	if strings.TrimSpace(result.Tension) == "" {
		return nil, fmt.Errorf("AI returned empty tension")
	}
	if strings.TrimSpace(result.Advice) == "" {
		return nil, fmt.Errorf("AI returned empty advice")
	}

	return &result, nil
}

func (s *AuraMatchService) calculateCompatibilityFallback(userColor, friendColor string) (int, string, string, string) {
	var score int
	var matchType string

	// Same color = 85-100%
	if userColor == friendColor {
		score = 85 + rand.Intn(16)
		matchType = "same"
	} else if complementaryColors[userColor] == friendColor {
		// Complementary colors = 70-90%
		score = 70 + rand.Intn(21)
		matchType = "complementary"
	} else {
		// Check if colors are "challenging"
		challengingPairs := map[string][]string{
			"red":    {"orange", "gold"},
			"blue":   {"indigo", "violet"},
			"green":  {"pink", "white"},
			"yellow": {"orange", "gold"},
		}

		found := false
		for color, challengers := range challengingPairs {
			if userColor == color {
				for _, c := range challengers {
					if friendColor == c {
						score = 30 + rand.Intn(31)
						matchType = "challenging"
						found = true
						break
					}
				}
			}
			if found {
				break
			}
		}

		if !found {
			// Neutral = 50-75%
			score = 50 + rand.Intn(26)
			matchType = "neutral"
		}
	}

	synergy := fmt.Sprintf("%s Your %s aura meets their %s energy. %s", synergyMessages[matchType], userColor, friendColor, getSynergyDetail(userColor, friendColor))
	tension := tensionMessages[matchType]
	advice := adviceMessages[matchType]

	return score, synergy, tension, advice
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

	var score int
	var synergy, tension, advice string

	// Try AI-powered analysis if API key is configured
	if s.cfg.OpenAIAPIKey != "" {
		aiResult, err := s.calculateCompatibilityAI(userAura, friendAura)
		if err != nil {
			log.Printf("OpenAI match API error, falling back to mock: %v", err)
			score, synergy, tension, advice = s.calculateCompatibilityFallback(userAura.AuraColor, friendAura.AuraColor)
		} else {
			score = aiResult.CompatibilityScore
			synergy = aiResult.Synergy
			tension = aiResult.Tension
			advice = aiResult.Advice
		}
	} else {
		score, synergy, tension, advice = s.calculateCompatibilityFallback(userAura.AuraColor, friendAura.AuraColor)
	}

	match := &models.AuraMatch{
		UserID:             userID,
		FriendID:           friendID,
		UserAuraID:         userAura.ID,
		FriendAuraID:       friendAura.ID,
		CompatibilityScore: score,
		Synergy:            synergy,
		Tension:            tension,
		Advice:             advice,
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
