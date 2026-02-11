package middleware

import (
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/dto"
	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func JWTProtected(cfg *config.Config) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(cfg.JWTSecret)},
		SuccessHandler: func(c *fiber.Ctx) error {
			token, ok := c.Locals("user").(*jwt.Token)
			if !ok {
				return c.Status(fiber.StatusUnauthorized).JSON(dto.ErrorResponse{
					Error:   true,
					Message: "Unauthorized: invalid or expired token",
				})
			}
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				return c.Status(fiber.StatusUnauthorized).JSON(dto.ErrorResponse{
					Error:   true,
					Message: "Unauthorized: invalid or expired token",
				})
			}
			sub, _ := claims["sub"].(string)
			if sub == "" {
				return c.Status(fiber.StatusUnauthorized).JSON(dto.ErrorResponse{
					Error:   true,
					Message: "Unauthorized: invalid or expired token",
				})
			}

			// Keep compatibility with handlers that read userID from Fiber locals.
			c.Locals("userID", sub)
			return c.Next()
		},
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.ErrorResponse{
				Error:   true,
				Message: "Unauthorized: invalid or expired token",
			})
		},
	})
}
