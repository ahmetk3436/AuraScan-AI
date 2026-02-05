package handlers

import (
	"math"
	"strconv"

	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuraHandler struct {
	auraService *services.AuraService
}

func NewAuraHandler(auraService *services.AuraService) *AuraHandler {
	return &AuraHandler{auraService: auraService}
}

func (h *AuraHandler) Scan(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	var req dto.CreateAuraRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": true, "message": "Invalid request body"})
	}

	reading, err := h.auraService.Create(parsedUserID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to create aura reading"})
	}

	return c.Status(fiber.StatusCreated).JSON(reading)
}

func (h *AuraHandler) GetList(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	readings, total, err := h.auraService.List(parsedUserID, page, pageSize)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to fetch readings"})
	}

	responseData := make([]dto.AuraResponse, len(readings))
	for i, r := range readings {
		responseData[i] = dto.AuraResponse{
			ID:             r.ID,
			ImageURL:       r.ImageURL,
			AuraColor:      r.AuraColor,
			SecondaryColor: r.SecondaryColor,
			EnergyLevel:    r.EnergyLevel,
			MoodScore:      r.MoodScore,
			Personality:    r.Personality,
			Strengths:      r.Strengths,
			Challenges:     r.Challenges,
			DailyAdvice:    r.DailyAdvice,
			AnalyzedAt:     r.AnalyzedAt,
			CreatedAt:      r.CreatedAt,
		}
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return c.JSON(dto.PaginatedAuraResponse{
		Data:       responseData,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

func (h *AuraHandler) GetDetail(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	id := c.Params("id")
	parsedID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": true, "message": "Invalid reading ID"})
	}

	reading, err := h.auraService.GetByID(parsedUserID, parsedID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": true, "message": "Reading not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to fetch reading"})
	}

	return c.JSON(reading)
}

func (h *AuraHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	id := c.Params("id")
	parsedID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": true, "message": "Invalid reading ID"})
	}

	if err := h.auraService.Delete(parsedUserID, parsedID); err != nil {
		if err.Error() == "record not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": true, "message": "Reading not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to delete reading"})
	}

	return c.Status(fiber.StatusNoContent).Send(nil)
}

func (h *AuraHandler) GetLatest(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	reading, err := h.auraService.GetLatest(parsedUserID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": true, "message": "No readings found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to fetch reading"})
	}

	return c.JSON(reading)
}

func (h *AuraHandler) GetToday(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	reading, err := h.auraService.GetToday(parsedUserID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": true, "message": "No reading found for today"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to fetch reading"})
	}

	return c.JSON(reading)
}

func (h *AuraHandler) GetStats(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": true, "message": "Invalid user ID"})
	}

	stats, err := h.auraService.GetStats(parsedUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": true, "message": "Failed to fetch stats"})
	}

	return c.JSON(stats)
}