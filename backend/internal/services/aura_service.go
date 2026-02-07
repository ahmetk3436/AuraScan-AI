package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/models"
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

// auraAnalysisResult is the structured response expected from OpenAI
type auraAnalysisResult struct {
	AuraColor      string   `json:"aura_color"`
	SecondaryColor string   `json:"secondary_color"`
	EnergyLevel    int      `json:"energy_level"`
	MoodScore      int      `json:"mood_score"`
	Personality    string   `json:"personality"`
	Strengths      []string `json:"strengths"`
	Challenges     []string `json:"challenges"`
	DailyAdvice    string   `json:"daily_advice"`
}

// Create performs an aura scan by analyzing an image via OpenAI Vision API
func (s *AuraService) Create(userID uuid.UUID, req *dto.CreateAuraRequest) (*models.AuraReading, error) {
	// Determine image source
	imageContent := ""
	if req.ImageData != "" {
		// Base64 data
		imageContent = "data:image/jpeg;base64," + req.ImageData
	} else if req.ImageURL != "" && strings.HasPrefix(req.ImageURL, "http") {
		imageContent = req.ImageURL
	} else {
		return nil, fmt.Errorf("either image_data (base64) or image_url (https) is required")
	}

	// Call OpenAI Vision API
	analysis, err := s.callOpenAIVision(imageContent)
	if err != nil {
		return nil, fmt.Errorf("AI analysis failed: %w", err)
	}

	// Store image reference
	storedURL := "base64_upload"
	if req.ImageURL != "" && strings.HasPrefix(req.ImageURL, "http") {
		storedURL = req.ImageURL
	}

	// Build secondary color pointer
	var secondaryColor *string
	if analysis.SecondaryColor != "" {
		secondaryColor = &analysis.SecondaryColor
	}

	// Clamp values
	energyLevel := analysis.EnergyLevel
	if energyLevel < 1 {
		energyLevel = 1
	}
	if energyLevel > 100 {
		energyLevel = 100
	}
	moodScore := analysis.MoodScore
	if moodScore < 1 {
		moodScore = 1
	}
	if moodScore > 10 {
		moodScore = 10
	}

	reading := models.AuraReading{
		ID:             uuid.New(),
		UserID:         userID,
		ImageURL:       storedURL,
		AuraColor:      analysis.AuraColor,
		SecondaryColor: secondaryColor,
		EnergyLevel:    energyLevel,
		MoodScore:      moodScore,
		Personality:    analysis.Personality,
		Strengths:      analysis.Strengths,
		Challenges:     analysis.Challenges,
		DailyAdvice:    analysis.DailyAdvice,
		AnalyzedAt:     time.Now().UTC(),
	}

	if err := s.db.Create(&reading).Error; err != nil {
		return nil, fmt.Errorf("failed to save aura reading: %w", err)
	}

	return &reading, nil
}

// GetByID retrieves a single aura reading by ID
func (s *AuraService) GetByID(readingID uuid.UUID, userID uuid.UUID) (*models.AuraReading, error) {
	var reading models.AuraReading
	err := s.db.Where("id = ? AND user_id = ?", readingID, userID).First(&reading).Error
	if err != nil {
		return nil, fmt.Errorf("reading not found: %w", err)
	}
	return &reading, nil
}

// List returns paginated aura readings for a user
func (s *AuraService) List(userID uuid.UUID, page, pageSize int) (*dto.AuraListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var totalCount int64
	s.db.Model(&models.AuraReading{}).Where("user_id = ?", userID).Count(&totalCount)

	var readings []models.AuraReading
	offset := (page - 1) * pageSize
	err := s.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&readings).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch readings: %w", err)
	}

	data := make([]dto.AuraReadingResponse, len(readings))
	for i, r := range readings {
		data[i] = dto.AuraReadingResponse{
			ID:             r.ID,
			UserID:         r.UserID,
			AuraColor:      r.AuraColor,
			SecondaryColor: r.SecondaryColor,
			EnergyLevel:    r.EnergyLevel,
			MoodScore:      r.MoodScore,
			Personality:    r.Personality,
			Strengths:      r.Strengths,
			Challenges:     r.Challenges,
			DailyAdvice:    r.DailyAdvice,
			ImageURL:       r.ImageURL,
			AnalyzedAt:     r.AnalyzedAt,
			CreatedAt:      r.CreatedAt,
		}
	}

	return &dto.AuraListResponse{
		Data:       data,
		Page:       page,
		PageSize:   pageSize,
		TotalCount: totalCount,
	}, nil
}

// GetStats returns aggregated stats for a user's aura readings
func (s *AuraService) GetStats(userID uuid.UUID) (*dto.AuraStatsResponse, error) {
	var totalCount int64
	s.db.Model(&models.AuraReading{}).Where("user_id = ?", userID).Count(&totalCount)

	var avgEnergy, avgMood float64
	s.db.Model(&models.AuraReading{}).
		Where("user_id = ?", userID).
		Select("COALESCE(AVG(energy_level), 0)").
		Scan(&avgEnergy)
	s.db.Model(&models.AuraReading{}).
		Where("user_id = ?", userID).
		Select("COALESCE(AVG(mood_score), 0)").
		Scan(&avgMood)

	// Color distribution
	type colorCount struct {
		AuraColor string
		Count     int
	}
	var colorCounts []colorCount
	s.db.Model(&models.AuraReading{}).
		Where("user_id = ?", userID).
		Select("aura_color, COUNT(*) as count").
		Group("aura_color").
		Scan(&colorCounts)

	distribution := make(map[string]int)
	for _, cc := range colorCounts {
		distribution[cc.AuraColor] = cc.Count
	}

	return &dto.AuraStatsResponse{
		ColorDistribution: distribution,
		TotalReadings:     totalCount,
		AverageEnergy:     avgEnergy,
		AverageMood:       avgMood,
	}, nil
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

// callOpenAIVision calls the OpenAI Vision API to analyze an image
func (s *AuraService) callOpenAIVision(imageURL string) (*auraAnalysisResult, error) {
	apiKey := s.cfg.OpenAIAPIKey
	if apiKey == "" {
		// Return mock data when no API key is configured
		return &auraAnalysisResult{
			AuraColor:      "Violet",
			SecondaryColor: "Pink",
			EnergyLevel:    78,
			MoodScore:      8,
			Personality:    "You radiate creative energy and deep intuition. Your violet aura suggests a strong connection to imagination, spiritual awareness, and artistic expression. People are drawn to your mysterious yet warm presence.",
			Strengths:      []string{"Creative thinking", "Emotional depth", "Intuitive wisdom", "Artistic vision"},
			Challenges:     []string{"Overthinking", "Setting boundaries", "Staying grounded"},
			DailyAdvice:    "Trust your creative instincts today. Your energy is perfectly aligned for artistic pursuits and meaningful conversations.",
		}, nil
	}

	model := s.cfg.OpenAIModel
	if model == "" {
		model = "gpt-4o-mini"
	}

	systemPrompt := `You are an expert aura reader and energy analyst. Analyze the person's photo and determine their aura color, energy level, mood, and personality traits.

You MUST respond with valid JSON only, no other text. Use this exact structure:
{
  "aura_color": "one of: Red, Orange, Yellow, Green, Blue, Indigo, Violet, Pink, Turquoise, Gold",
  "secondary_color": "optional secondary aura color or empty string",
  "energy_level": 1-100 integer,
  "mood_score": 1-10 integer,
  "personality": "2-3 sentences about the person's energy and personality based on their aura",
  "strengths": ["strength1", "strength2", "strength3", "strength4"],
  "challenges": ["challenge1", "challenge2", "challenge3"],
  "daily_advice": "1-2 sentences of personalized daily guidance"
}`

	reqBody := openAIRequest{
		Model: model,
		Messages: []openAIMessage{
			{Role: "system", Content: systemPrompt},
			{
				Role: "user",
				Content: []map[string]interface{}{
					{"type": "text", "text": "Analyze this person's aura energy from their photo. Respond with JSON only."},
					{
						"type": "image_url",
						"image_url": map[string]string{
							"url":    imageURL,
							"detail": "low",
						},
					},
				},
			},
		},
		MaxTokens:   1024,
		Temperature: 0.7,
		ResponseFormat: &responseFormat{
			Type: "json_object",
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	apiURL := "https://api.openai.com/v1/chat/completions"

	httpReq, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("OpenAI API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OpenAI API error (status %d): %s", resp.StatusCode, string(body))
	}

	var apiResp openAIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	if apiResp.Error != nil {
		return nil, fmt.Errorf("OpenAI error: %s", apiResp.Error.Message)
	}

	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	content := apiResp.Choices[0].Message.Content

	var analysis auraAnalysisResult
	if err := json.Unmarshal([]byte(content), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse aura analysis: %w (content: %s)", err, content)
	}

	// Validate required fields
	if analysis.AuraColor == "" {
		analysis.AuraColor = "Violet"
	}

	return &analysis, nil
}
