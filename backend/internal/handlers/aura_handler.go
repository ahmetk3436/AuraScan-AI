package handlers

import (
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// AuraHandler handles HTTP requests related to Aura scanning
type AuraHandler struct {
	auraService *services.AuraService
}

// NewAuraHandler creates a new AuraHandler instance
func NewAuraHandler(auraService *services.AuraService) *AuraHandler {
	return &AuraHandler{auraService: auraService}
}

// CheckScanEligibility checks if the user can perform a scan
func (h *AuraHandler) CheckScanEligibility(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	isSubscribed := h.auraService.IsSubscribed(userID)

	allowed, remaining, err := h.auraService.CanScan(userID, isSubscribed)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check eligibility"})
	}

	return c.JSON(dto.ScanEligibilityResponse{
		CanScan:      allowed,
		Remaining:    remaining,
		IsSubscribed: isSubscribed,
	})
}

// Scan handles the image upload and analysis request
func (h *AuraHandler) Scan(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	isSubscribed := h.auraService.IsSubscribed(userID)

	allowed, _, err := h.auraService.CanScan(userID, isSubscribed)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify scan eligibility"})
	}

	if !allowed {
		return c.Status(429).JSON(fiber.Map{"error": "Daily scan limit reached. Upgrade to Premium for unlimited scans."})
	}

	// Proceed with scan logic
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Scan logic proceeds here"})
}
