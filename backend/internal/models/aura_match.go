package models

import (
	"time"

	"github.com/google/uuid"
)

type AuraMatch struct {
	ID                 uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	UserID             uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	FriendID           uuid.UUID `gorm:"type:uuid;not null;index" json:"friend_id"`
	UserAuraID         uuid.UUID `gorm:"type:uuid;not null" json:"user_aura_id"`
	FriendAuraID       uuid.UUID `gorm:"type:uuid;not null" json:"friend_aura_id"`
	CompatibilityScore int       `gorm:"type:integer;check:compatibility_score >= 0 AND compatibility_score <= 100" json:"compatibility_score"`
	Synergy            string    `gorm:"type:text" json:"synergy"`
	Tension            string    `gorm:"type:text" json:"tension"`
	Advice             string    `gorm:"type:text" json:"advice"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

func (AuraMatch) TableName() string {
	return "aura_matches"
}
