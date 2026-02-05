package routes

import (
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/handlers"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

func Setup(
	app *fiber.App,
	cfg *config.Config,
	authHandler *handlers.AuthHandler,
	healthHandler *handlers.HealthHandler,
	webhookHandler *handlers.WebhookHandler,
	moderationHandler *handlers.ModerationHandler,
	auraHandler *handlers.AuraHandler,
	auraMatchHandler *handlers.AuraMatchHandler,
	streakHandler *handlers.StreakHandler,
) {
	api := app.Group("/api")

	// Health
	api.Get("/health", healthHandler.Check)

	// Auth (public)
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/apple", authHandler.AppleSignIn) // Sign in with Apple (Guideline 4.8)

	// Auth (protected)
	protected := api.Group("", middleware.JWTProtected(cfg))
	protected.Post("/auth/logout", authHandler.Logout)
	protected.Delete("/auth/account", authHandler.DeleteAccount) // Account deletion (Guideline 5.1.1)

	// Aura - User endpoints (protected)
	aura := protected.Group("/aura")
	aura.Post("/scan", auraHandler.Scan)           // Create new aura reading
	aura.Get("", auraHandler.GetList)              // List user's aura readings (paginated)
	aura.Get("/latest", auraHandler.GetLatest)     // Get user's most recent aura
	aura.Get("/today", auraHandler.GetToday)       // Get today's aura
	aura.Get("/stats", auraHandler.GetStats)       // Get aura color distribution
	aura.Get("/:id", auraHandler.GetDetail)        // Get single aura reading
	aura.Delete("/:id", auraHandler.Delete)        // Soft delete

	// Aura Match - Compatibility endpoints (protected)
	aura.Post("/match", auraMatchHandler.CreateMatch)            // Calculate compatibility with friend
	aura.Get("/matches", auraMatchHandler.GetMatches)            // List all matches
	aura.Get("/match/:friend_id", auraMatchHandler.GetMatchByFriend) // Get match with specific friend

	// Streak - Gamification endpoints (protected)
	aura.Get("/streak", streakHandler.GetStreak)        // Get user's streak info
	aura.Post("/streak/update", streakHandler.UpdateStreak) // Update streak after scan

	// Moderation - User endpoints (protected)
	protected.Post("/reports", moderationHandler.CreateReport)     // Report content (Guideline 1.2)
	protected.Post("/blocks", moderationHandler.BlockUser)         // Block user (Guideline 1.2)
	protected.Delete("/blocks/:id", moderationHandler.UnblockUser) // Unblock user

	// Admin moderation panel (protected + admin check)
	// In production, add an admin role middleware here
	admin := api.Group("/admin", middleware.JWTProtected(cfg))
	admin.Get("/moderation/reports", moderationHandler.ListReports)
	admin.Put("/moderation/reports/:id", moderationHandler.ActionReport)

	// Webhooks (verified by auth header, not JWT)
	webhooks := api.Group("/webhooks")
	webhooks.Post("/revenuecat", webhookHandler.HandleRevenueCat)
}