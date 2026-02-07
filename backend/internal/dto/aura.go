package dto

// ScanEligibilityResponse defines the response structure for scan eligibility checks
type ScanEligibilityResponse struct {
	CanScan      bool `json:"canScan"`
	Remaining    int  `json:"remaining"`
	IsSubscribed bool `json:"isSubscribed"`
}