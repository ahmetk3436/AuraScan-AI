package handlers

import (
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type StreakHandler struct {
	streakService *services.StreakService
}

func NewStreakHandler(streakService *services.StreakService) *StreakHandler {
	return &StreakHandler{streakService: streakService}
}

func (h *StreakHandler) GetStreak(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	streak, err := h.streakService.Get(parsedUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to fetch streak"})
	}

	return c.JSON(streak)
}

func (h *StreakHandler) UpdateStreak(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	result, err := h.streakService.Update(parsedUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to update streak"})
	}

	return c.JSON(result)
}
