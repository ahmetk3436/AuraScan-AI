package handlers

import "github.com/gofiber/fiber/v2"

type LegalHandler struct{}

func NewLegalHandler() *LegalHandler { return &LegalHandler{} }

func (h *LegalHandler) PrivacyPolicy(c *fiber.Ctx) error {
	html := `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy - AuraSnap</title><style>body{font-family:-apple-system,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;line-height:1.6}h1{color:#8B5CF6}h2{color:#7C3AED;margin-top:30px}</style></head><body><h1>Privacy Policy</h1><p><strong>Last updated:</strong> February 7, 2026</p><p>AuraSnap ("we", "our", or "us") is committed to protecting your privacy.</p><h2>Information We Collect</h2><ul><li><strong>Account Information:</strong> Email address and encrypted password.</li><li><strong>Photos:</strong> Photos you upload for aura analysis are processed temporarily and not stored permanently.</li><li><strong>Usage Data:</strong> App interaction data including aura results and streak information.</li></ul><h2>How We Use Your Information</h2><ul><li>To provide aura color personality analysis</li><li>To enable AuraMatch friend compatibility features</li><li>To track your daily streaks and unlock rare colors</li><li>To generate shareable aura cards</li></ul><h2>Data Storage & Security</h2><p>Your data is stored securely on encrypted servers. Photos are processed temporarily for analysis. We use JWT authentication and encrypted connections.</p><h2>Third-Party Services</h2><ul><li><strong>RevenueCat:</strong> Subscription management. See their <a href="https://www.revenuecat.com/privacy">privacy policy</a>.</li><li><strong>Apple Sign In:</strong> We receive only your email and name from Apple.</li></ul><h2>Data Deletion</h2><p>You can delete your account and all data from the Settings screen.</p><h2>Children's Privacy</h2><p>Not intended for children under 13.</p><h2>Contact</h2><p>Questions? Email: <strong>ahmetk3436@gmail.com</strong></p></body></html>`
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}

func (h *LegalHandler) TermsOfService(c *fiber.Ctx) error {
	html := `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Terms of Service - AuraSnap</title><style>body{font-family:-apple-system,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;line-height:1.6}h1{color:#8B5CF6}h2{color:#7C3AED;margin-top:30px}</style></head><body><h1>Terms of Service</h1><p><strong>Last updated:</strong> February 7, 2026</p><p>By using AuraSnap, you agree to these terms.</p><h2>Use of Service</h2><p>AuraSnap provides aura color personality analysis for entertainment purposes. Results are not scientifically validated. You must be at least 13 years old.</p><h2>Subscriptions</h2><ul><li>Premium features require a paid subscription via Apple's App Store.</li><li>Cancel anytime through Apple ID settings.</li><li>Refunds handled by Apple.</li></ul><h2>Content Guidelines</h2><ul><li>Do not upload inappropriate or illegal content.</li><li>We may remove content violating our guidelines.</li></ul><h2>Limitation of Liability</h2><p>AuraSnap is provided "as is". Aura readings are for entertainment only.</p><h2>Contact</h2><p>Email: <strong>ahmetk3436@gmail.com</strong></p></body></html>`
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}
