package services

import (
	"errors"
	"math/rand"
	"time"

	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuraService struct {
	db *gorm.DB
}

func NewAuraService(db *gorm.DB) *AuraService {
	return &AuraService{db: db}
}

var colorTraits = map[string]struct {
	personality string
	strengths   []string
	challenges  []string
	dailyAdvice string
}{
	"red": {
		personality: "Passionate, energetic, and action-oriented.",
		strengths:   []string{"Courage", "Leadership", "Determination"},
		challenges:  []string{"Impulsiveness", "Patience", "Anger Management"},
		dailyAdvice: "Channel your energy into a physical activity today. Avoid hasty decisions.",
	},
	"orange": {
		personality: "Creative, social, and adventurous.",
		strengths:   []string{"Creativity", "Optimism", "Social Skills"},
		challenges:  []string{"Scattered Focus", "Restlessness", "Overcommitment"},
		dailyAdvice: "Start a new creative project. Connect with an old friend.",
	},
	"yellow": {
		personality: "Optimistic, intellectual, and cheerful.",
		strengths:   []string{"Analytical Thinking", "Positivity", "Communication"},
		challenges:  []string{"Critical Nature", "Overthinking", "Perfectionism"},
		dailyAdvice: "Share your ideas with others. Take time to relax your mind.",
	},
	"green": {
		personality: "Balanced, growth-oriented, and nurturing.",
		strengths:   []string{"Compassion", "Reliability", "Growth Mindset"},
		challenges:  []string{"Jealousy", "Possessiveness", "Insecurity"},
		dailyAdvice: "Spend time in nature. Nurture a relationship or a plant.",
	},
	"blue": {
		personality: "Calm, intuitive, and trustworthy.",
		strengths:   []string{"Communication", "Intuition", "Loyalty"},
		challenges:  []string{"Fear of Expression", "Melancholy", "Stubbornness"},
		dailyAdvice: "Speak your truth today. Trust your gut feelings.",
	},
	"indigo": {
		personality: "Intuitive, wise, and deeply spiritual.",
		strengths:   []string{"Vision", "Wisdom", "Integrity"},
		challenges:  []string{"Isolation", "Judgment", "Rigidity"},
		dailyAdvice: "Meditate or reflect on your long-term goals. Practice forgiveness.",
	},
	"violet": {
		personality: "Visionary, artistic, and magical.",
		strengths:   []string{"Imagination", "Humanitarianism", "Leadership"},
		challenges:  []string{"Unrealistic Expectations", "Arrogance", "Detachment"},
		dailyAdvice: "Engage in art or music. Visualize your ideal future.",
	},
	"white": {
		personality: "Pure, balanced, and spiritually connected.",
		strengths:   []string{"Purity", "Healing", "High Vibration"},
		challenges:  []string{"Vulnerability", "Naivety", "Disconnection from Reality"},
		dailyAdvice: "Focus on cleansing your space, physical or mental. Protect your energy.",
	},
	"gold": {
		personality: "Confident, abundant, and empowered.",
		strengths:   []string{"Confidence", "Generosity", "Willpower"},
		challenges:  []string{"Ego", "Greed", "Overbearing nature"},
		dailyAdvice: "Share your abundance with others. Practice humility.",
	},
	"pink": {
		personality: "Loving, gentle, and compassionate.",
		strengths:   []string{"Love", "Empathy", "Nurturing"},
		challenges:  []string{"Neediness", "Martyrdom", "Lack of Boundaries"},
		dailyAdvice: "Practice self-love. Set healthy boundaries with kindness.",
	},
}

var secondaryColors = []string{"silver", "gold", "white", "black", "grey"}

func (s *AuraService) Create(userID uuid.UUID, req dto.CreateAuraRequest) (*models.AuraReading, error) {
	// Generate Mock Data
	colors := []string{"red", "orange", "yellow", "green", "blue", "indigo", "violet", "white", "gold", "pink"}
	selectedColor := colors[rand.Intn(len(colors))]
	traits := colorTraits[selectedColor]

	var secColor *string
	if rand.Intn(10) > 7 { // 30% chance of secondary color
		sc := secondaryColors[rand.Intn(len(secondaryColors))]
		secColor = &sc
	}

	energyLevel := rand.Intn(56) + 40 // 40-95
	moodScore := rand.Intn(6) + 5     // 5-10

	reading := &models.AuraReading{
		UserID:         userID,
		ImageURL:       req.ImageURL,
		AuraColor:      selectedColor,
		SecondaryColor: secColor,
		EnergyLevel:    energyLevel,
		MoodScore:      moodScore,
		Personality:    traits.personality,
		Strengths:      traits.strengths,
		Challenges:     traits.challenges,
		DailyAdvice:    traits.dailyAdvice,
		AnalyzedAt:     time.Now(),
	}

	if err := s.db.Create(reading).Error; err != nil {
		return nil, err
	}

	return reading, nil
}

func (s *AuraService) GetByID(userID, id uuid.UUID) (*models.AuraReading, error) {
	var reading models.AuraReading
	err := s.db.Where("user_id = ? AND id = ?", userID, id).First(&reading).Error
	if err != nil {
		return nil, err
	}
	return &reading, nil
}

func (s *AuraService) List(userID uuid.UUID, page, pageSize int) ([]models.AuraReading, int64, error) {
	var readings []models.AuraReading
	var total int64

	offset := (page - 1) * pageSize

	if err := s.db.Model(&models.AuraReading{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := s.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&readings).Error

	if err != nil {
		return nil, 0, err
	}

	return readings, total, nil
}

func (s *AuraService) GetLatest(userID uuid.UUID) (*models.AuraReading, error) {
	var reading models.AuraReading
	err := s.db.Where("user_id = ?", userID).Order("created_at DESC").First(&reading).Error
	if err != nil {
		return nil, err
	}
	return &reading, nil
}

func (s *AuraService) GetToday(userID uuid.UUID) (*models.AuraReading, error) {
	var reading models.AuraReading
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	err := s.db.Where("user_id = ? AND created_at >= ? AND created_at < ?", userID, startOfDay, endOfDay).
		Order("created_at DESC").
		First(&reading).Error

	if err != nil {
		return nil, err
	}
	return &reading, nil
}

func (s *AuraService) Delete(userID, id uuid.UUID) error {
	result := s.db.Where("user_id = ? AND id = ?", userID, id).Delete(&models.AuraReading{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("record not found")
	}
	return nil
}

func (s *AuraService) GetStats(userID uuid.UUID) (*dto.AuraStatsResponse, error) {
	var readings []models.AuraReading
	if err := s.db.Where("user_id = ?", userID).Find(&readings).Error; err != nil {
		return nil, err
	}

	if len(readings) == 0 {
		return &dto.AuraStatsResponse{
			ColorDistribution: make(map[string]int),
			TotalReadings:     0,
			AverageEnergy:     0,
			AverageMood:       0,
		}, nil
	}

	colorDist := make(map[string]int)
	totalEnergy := 0
	totalMood := 0

	for _, r := range readings {
		colorDist[r.AuraColor]++
		totalEnergy += r.EnergyLevel
		totalMood += r.MoodScore
	}

	return &dto.AuraStatsResponse{
		ColorDistribution: colorDist,
		TotalReadings:     int64(len(readings)),
		AverageEnergy:     float64(totalEnergy) / float64(len(readings)),
		AverageMood:       float64(totalMood) / float64(len(readings)),
	}, nil
}