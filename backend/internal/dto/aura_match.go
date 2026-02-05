package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateMatchRequest struct {
	FriendID string `json:"friend_id" validate:"required,uuid"`
}

type AuraMatchResponse struct {
	ID                 uuid.UUID `json:"id"`
	UserID             uuid.UUID `json:"user_id"`
	FriendID           uuid.UUID `json:"friend_id"`
	UserAuraID         uuid.UUID `json:"user_aura_id"`
	FriendAuraID       uuid.UUID `json:"friend_aura_id"`
	CompatibilityScore int       `json:"compatibility_score"`
	Synergy            string    `json:"synergy"`
	Tension            string    `json:"tension"`
	Advice             string    `json:"advice"`
	UserAuraColor      string    `json:"user_aura_color"`
	FriendAuraColor    string    `json:"friend_aura_color"`
	CreatedAt          time.Time `json:"created_at"`
}
