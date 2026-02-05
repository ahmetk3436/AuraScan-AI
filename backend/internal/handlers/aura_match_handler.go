package handlers

import (
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuraMatchHandler struct {
	matchService *services.AuraMatchService
}

func NewAuraMatchHandler(matchService *services.AuraMatchService) *AuraMatchHandler {
	return &AuraMatchHandler{matchService: matchService}
}

func (h *AuraMatchHandler) CreateMatch(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	var req dto.CreateMatchRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": true, "message": "Invalid request body"})
	}

	match, err := h.matchService.Create(parsedUserID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": true, "message": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(match)
}

func (h *AuraMatchHandler) GetMatches(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	matches, err := h.matchService.List(parsedUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to fetch matches"})
	}

	return c.JSON(fiber.Map{"data": matches})
}

func (h *AuraMatchHandler) GetMatchByFriend(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	friendIDStr := c.Params("friend_id")
	friendID, err := uuid.Parse(friendIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": true, "message": "Invalid friend ID"})
	}

	match, err := h.matchService.GetByFriend(parsedUserID, friendID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": true, "message": "No match found with this friend"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to fetch match"})
	}

	return c.JSON(match)
}
