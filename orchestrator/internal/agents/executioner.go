package agents

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// ExecutionerMode defines how the executioner writes code.
type ExecutionerMode string

const (
	ModeAPI ExecutionerMode = "api" // Use LLM API (GLM-4, DeepSeek, etc.)
	ModeCLI ExecutionerMode = "cli" // Use Claude CLI
)

// Executioner writes code to files. Supports two modes:
// - API mode: Calls LLM API, parses response, writes files to disk
// - CLI mode: Spawns Claude CLI which writes files directly
type Executioner struct {
	mode    ExecutionerMode
	timeout time.Duration
	workDir string

	// API mode fields
	apiKey string
	apiURL string
	model  string
	client *http.Client

	// Fallback tracking
	consecutiveFailures int
	fallbackEnabled     bool
}

// ExecutionerConfig holds all configuration for the Executioner.
type ExecutionerConfig struct {
	Mode            string
	WorkDir         string
	Timeout         time.Duration
	APIKey          string
	APIURL          string
	Model           string
	FallbackEnabled bool // Enable automatic fallback to Claude CLI after failures
}

// NewExecutioner creates an Executioner based on configuration.
func NewExecutioner(cfg ExecutionerConfig) *Executioner {
	mode := ModeAPI
	if strings.ToLower(cfg.Mode) == "cli" {
		mode = ModeCLI
	}

	return &Executioner{
		mode:            mode,
		timeout:         cfg.Timeout,
		workDir:         cfg.WorkDir,
		apiKey:          cfg.APIKey,
		apiURL:          cfg.APIURL,
		model:           cfg.Model,
		client:          &http.Client{Timeout: cfg.Timeout},
		fallbackEnabled: cfg.FallbackEnabled,
	}
}

func (e *Executioner) Name() string {
	return "Executioner"
}

// ResetFailures resets the failure counter (call after successful test)
func (e *Executioner) ResetFailures() {
	e.consecutiveFailures = 0
}

// IncrementFailures increments failure count and returns true if should fallback
func (e *Executioner) IncrementFailures() bool {
	e.consecutiveFailures++
	// After 3 consecutive failures, suggest fallback to Claude CLI
	return e.fallbackEnabled && e.consecutiveFailures >= 3 && e.mode == ModeAPI
}

// SwitchToCLI switches the executioner to Claude CLI mode
func (e *Executioner) SwitchToCLI() {
	log.Printf("[EXEC] Switching to Claude CLI mode after %d API failures", e.consecutiveFailures)
	e.mode = ModeCLI
}

// GetMode returns the current execution mode
func (e *Executioner) GetMode() ExecutionerMode {
	return e.mode
}

func (e *Executioner) Execute(ctx context.Context, prompt string) (string, error) {
	switch e.mode {
	case ModeCLI:
		return e.executeCLI(ctx, prompt)
	case ModeAPI:
		return e.executeAPI(ctx, prompt)
	default:
		return e.executeAPI(ctx, prompt)
	}
}

// executeCLI spawns Claude CLI to write code.
func (e *Executioner) executeCLI(ctx context.Context, prompt string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, e.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "claude", "-p", "--dangerously-skip-permissions", prompt)
	cmd.Dir = e.workDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	output := stdout.String()
	errOutput := stderr.String()

	if err != nil {
		return "", fmt.Errorf("claude CLI error: %w\nstdout: %s\nstderr: %s",
			err, output, errOutput)
	}

	if errOutput != "" {
		output += "\n--- stderr ---\n" + errOutput
	}

	return strings.TrimSpace(output), nil
}

// executeAPI calls LLM API, parses file blocks from response, writes to disk.
func (e *Executioner) executeAPI(ctx context.Context, prompt string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, e.timeout)
	defer cancel()

	// Detect if this is a mobile or backend task
	isMobileTask := e.isMobileTask(prompt)

	var systemPrompt string
	if isMobileTask {
		systemPrompt = e.buildMobileSystemPrompt()
	} else {
		systemPrompt = e.buildBackendSystemPrompt()
	}

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: prompt},
	}

	response, err := e.callAPI(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("API call failed: %w", err)
	}

	// Parse and write files
	filesWritten, err := e.parseAndWriteFiles(response)
	if err != nil {
		return response, fmt.Errorf("file writing failed: %w\nAPI response:\n%s", err, response)
	}

	result := fmt.Sprintf("API response received (%d chars). Files written: %s",
		len(response), strings.Join(filesWritten, ", "))

	return result, nil
}

// parseAndWriteFiles extracts file blocks from LLM response and writes them.
func (e *Executioner) parseAndWriteFiles(response string) ([]string, error) {
	// Match: --- FILE: path/to/file.ext ---\n..content..\n--- END FILE ---
	pattern := regexp.MustCompile(`(?s)--- FILE: (.+?) ---\n(.*?)\n--- END FILE ---`)
	matches := pattern.FindAllStringSubmatch(response, -1)

	if len(matches) == 0 {
		// Try alternative format: ```path/to/file.ext\n..content..\n```
		altPattern := regexp.MustCompile("(?s)```([a-zA-Z0-9_/.-]+\\.[a-z]+)\n(.*?)\n```")
		matches = altPattern.FindAllStringSubmatch(response, -1)
	}

	if len(matches) == 0 {
		return nil, fmt.Errorf("no file blocks found in response")
	}

	var filesWritten []string

	for _, match := range matches {
		filePath := strings.TrimSpace(match[1])
		content := match[2]

		// Security: prevent path traversal
		if strings.Contains(filePath, "..") {
			continue
		}

		fullPath := filepath.Join(e.workDir, filePath)

		// Create parent directories
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return filesWritten, fmt.Errorf("failed to create directory %s: %w", dir, err)
		}

		// Write file
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			return filesWritten, fmt.Errorf("failed to write file %s: %w", filePath, err)
		}

		filesWritten = append(filesWritten, filePath)
	}

	return filesWritten, nil
}

func (e *Executioner) callAPI(ctx context.Context, messages []ChatMessage) (string, error) {
	reqBody := ChatRequest{
		Model:       e.model,
		Messages:    messages,
		Temperature: 0.1,
		MaxTokens:   8192,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.apiURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+e.apiKey)

	resp, err := e.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return "", fmt.Errorf("unmarshal response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in API response")
	}

	return chatResp.Choices[0].Message.Content, nil
}

// isMobileTask detects if the task is for mobile development.
func (e *Executioner) isMobileTask(prompt string) bool {
	mobileKeywords := []string{
		"mobile/", "expo", "react native", "nativewind", ".tsx", "expo-router",
		"Mobile:", "mobile app", "mobile screen", "FlatList", "react-native",
	}
	promptLower := strings.ToLower(prompt)
	for _, keyword := range mobileKeywords {
		if strings.Contains(promptLower, strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}

// buildBackendSystemPrompt creates the system prompt for backend tasks.
func (e *Executioner) buildBackendSystemPrompt() string {
	codebaseContext := e.buildBackendContext()
	return fmt.Sprintf(`You are an expert Go backend engineer specializing in Go-Fiber and GORM.

%s

=== OUTPUT FORMAT ===
For each file you create or modify, use this EXACT format:

--- FILE: path/to/file.go ---
package example

// file contents here
--- END FILE ---

=== CRITICAL RULES ===
1. COPY the import patterns EXACTLY from the sample files above - do NOT modify import paths
2. Use relative paths from project root (e.g., backend/internal/models/user.go)
3. Include COMPLETE file contents - no placeholders, no "...", no abbreviated code
4. Match the EXACT coding style from the sample files
5. For new handlers: copy the EXACT function signature pattern from pet_handler.go
6. For new models: copy the EXACT struct tag pattern from pet.go
7. For new services: copy the EXACT constructor pattern from pet_service.go
8. When modifying routes.go: add new routes, do NOT change existing structure
9. DO NOT use chi, gorilla/mux, sqlx, or any framework not shown in samples
10. Output ONLY file blocks and brief explanations - no markdown code fences`, codebaseContext)
}

// buildMobileSystemPrompt creates the system prompt for mobile tasks.
func (e *Executioner) buildMobileSystemPrompt() string {
	mobileContext := e.buildMobileContext()
	return fmt.Sprintf(`You are an expert React Native / Expo developer specializing in TypeScript and NativeWind.

%s

=== OUTPUT FORMAT ===
For each file you create or modify, use this EXACT format:

--- FILE: path/to/file.tsx ---
import React from 'react';
// file contents here
--- END FILE ---

=== CRITICAL RULES ===
1. Use ONLY packages listed in the INSTALLED PACKAGES section above
2. DO NOT use @tanstack/react-query, react-native-calendars, or other unlisted packages
3. Use useState/useEffect for state management (NOT react-query)
4. Use relative paths from project root (e.g., mobile/app/(protected)/pets/index.tsx)
5. Include COMPLETE file contents - no placeholders, no "...", no abbreviated code
6. Use className for NativeWind styling (NOT StyleSheet.create)
7. Import haptics from lib/haptics.ts using the EXACT function names shown above
8. Use the api client from lib/api.ts for API calls (axios-based)
9. Follow Expo Router file-based routing conventions
10. Every component must be a default export`, mobileContext)
}

// buildBackendContext reads Go backend files to provide rich context for API mode.
func (e *Executioner) buildBackendContext() string {
	var ctx strings.Builder

	// 1. Extract module path from go.mod (CRITICAL for imports)
	modulePath := e.extractModulePath()
	if modulePath != "" {
		ctx.WriteString(fmt.Sprintf(`=== GO MODULE PATH (CRITICAL) ===
Module: %s

ALL internal imports MUST use this exact prefix:
  import "%s/internal/models"
  import "%s/internal/services"
  import "%s/internal/dto"
  import "%s/internal/handlers"
  import "%s/internal/middleware"
  import "%s/internal/config"

DO NOT use relative paths like "backend/internal/..." - they will NOT compile.

`, modulePath, modulePath, modulePath, modulePath, modulePath, modulePath, modulePath))
	}

	// 2. Framework requirements
	ctx.WriteString(`=== FRAMEWORK REQUIREMENTS ===
Backend uses Go-Fiber v2 + GORM (NOT chi, NOT sqlx, NOT gorilla/mux):
- HTTP: github.com/gofiber/fiber/v2
- ORM: gorm.io/gorm
- UUID: github.com/google/uuid
- JWT: github.com/golang-jwt/jwt/v5

`)

	// 3. Include sample model as reference
	modelSample := e.readSampleFile("backend/internal/models/pet.go")
	if modelSample != "" {
		ctx.WriteString("=== SAMPLE MODEL (backend/internal/models/pet.go) ===\n")
		ctx.WriteString("Follow this EXACT pattern for new models:\n\n")
		ctx.WriteString(modelSample)
		ctx.WriteString("\n\n")
	}

	// 4. Include sample service as reference
	serviceSample := e.readSampleFile("backend/internal/services/pet_service.go")
	if serviceSample != "" {
		ctx.WriteString("=== SAMPLE SERVICE (backend/internal/services/pet_service.go) ===\n")
		ctx.WriteString("Follow this EXACT pattern for new services:\n\n")
		ctx.WriteString(serviceSample)
		ctx.WriteString("\n\n")
	}

	// 5. Include sample DTO as reference
	dtoSample := e.readSampleFile("backend/internal/dto/pet_dto.go")
	if dtoSample != "" {
		ctx.WriteString("=== SAMPLE DTO (backend/internal/dto/pet_dto.go) ===\n")
		ctx.WriteString("Follow this EXACT pattern for new DTOs:\n\n")
		ctx.WriteString(dtoSample)
		ctx.WriteString("\n\n")
	}

	// 6. Include sample handler as reference (truncated for length)
	handlerSample := e.readSampleFileHead("backend/internal/handlers/pet_handler.go", 80)
	if handlerSample != "" {
		ctx.WriteString("=== SAMPLE HANDLER (backend/internal/handlers/pet_handler.go) ===\n")
		ctx.WriteString("Follow this EXACT pattern for new handlers:\n\n")
		ctx.WriteString(handlerSample)
		ctx.WriteString("\n\n")
	}

	// 7. Include current routes.go to show how to wire handlers
	routesSample := e.readSampleFile("backend/internal/routes/routes.go")
	if routesSample != "" {
		ctx.WriteString("=== CURRENT ROUTES (backend/internal/routes/routes.go) ===\n")
		ctx.WriteString("Add new routes following this EXACT structure:\n\n")
		ctx.WriteString(routesSample)
		ctx.WriteString("\n\n")
	}

	// 8. List existing files for awareness
	ctx.WriteString("=== EXISTING FILES ===\n")
	e.listDirectory(&ctx, "backend/internal/models", "Models")
	e.listDirectory(&ctx, "backend/internal/services", "Services")
	e.listDirectory(&ctx, "backend/internal/handlers", "Handlers")
	e.listDirectory(&ctx, "backend/internal/dto", "DTOs")

	// 9. Key conventions
	ctx.WriteString(`
=== KEY CONVENTIONS ===
1. UUID primary keys: gorm:"type:uuid;default:gen_random_uuid();primaryKey"
2. Soft delete: gorm.DeletedAt field with gorm:"index" tag
3. Service constructor: func NewXxxService(db *gorm.DB) *XxxService
4. Handler constructor: func NewXxxHandler(service *services.XxxService) *XxxHandler
5. Handler methods: func (h *XxxHandler) Create(c *fiber.Ctx) error
6. Error response: c.Status(fiber.StatusXxx).JSON(fiber.Map{"error": true, "message": "..."})
7. Get user from JWT: userID := c.Locals("userID").(string) then uuid.Parse(userID)
8. Parse body: c.BodyParser(&req)
9. Parse path param: c.Params("id")
`)

	return ctx.String()
}

// buildMobileContext reads mobile sample files to provide context.
func (e *Executioner) buildMobileContext() string {
	var ctx strings.Builder

	ctx.WriteString("=== MOBILE PROJECT CONTEXT ===\n")
	ctx.WriteString("Framework: Expo SDK 54 + React Native 0.81 + NativeWind v4 + Expo Router v6\n\n")

	// CRITICAL: Extract installed packages from package.json
	installedPkgs := e.extractInstalledPackages()
	if installedPkgs != "" {
		ctx.WriteString("=== INSTALLED PACKAGES (USE ONLY THESE) ===\n")
		ctx.WriteString("DO NOT use any packages not listed here!\n\n")
		ctx.WriteString(installedPkgs)
		ctx.WriteString("\n\n")
	}

	// Sample _layout.tsx for tabs
	layoutSample := e.readSampleFile("mobile/app/(protected)/_layout.tsx")
	if layoutSample != "" {
		ctx.WriteString("=== SAMPLE TABS LAYOUT (mobile/app/(protected)/_layout.tsx) ===\n")
		ctx.WriteString("Follow this EXACT pattern for adding new tabs:\n\n")
		ctx.WriteString(layoutSample)
		ctx.WriteString("\n\n")
	}

	// Sample API client
	apiSample := e.readSampleFile("mobile/lib/api.ts")
	if apiSample != "" {
		ctx.WriteString("=== API CLIENT (mobile/lib/api.ts) ===\n")
		ctx.WriteString("Use this client for all API calls:\n\n")
		ctx.WriteString(apiSample)
		ctx.WriteString("\n\n")
	}

	// Sample haptics - CRITICAL for correct function names
	hapticsSample := e.readSampleFile("mobile/lib/haptics.ts")
	if hapticsSample != "" {
		ctx.WriteString("=== HAPTICS (mobile/lib/haptics.ts) ===\n")
		ctx.WriteString("Import and use ONLY these exact function names:\n\n")
		ctx.WriteString(hapticsSample)
		ctx.WriteString("\n\n")
	}

	// Sample screen
	homeSample := e.readSampleFileHead("mobile/app/(protected)/home.tsx", 60)
	if homeSample != "" {
		ctx.WriteString("=== SAMPLE SCREEN (mobile/app/(protected)/home.tsx) ===\n")
		ctx.WriteString("Follow this pattern for new screens:\n\n")
		ctx.WriteString(homeSample)
		ctx.WriteString("\n\n")
	}

	// List existing files
	ctx.WriteString("=== EXISTING MOBILE FILES ===\n")
	e.listMobileDirectory(&ctx, "mobile/app/(protected)", "Protected Screens")
	e.listMobileDirectory(&ctx, "mobile/lib", "Lib Functions")
	e.listMobileDirectory(&ctx, "mobile/components", "Components")

	ctx.WriteString(`
=== KEY CONVENTIONS ===
1. Use className for styling: <View className="flex-1 bg-white p-4">
2. Use Ionicons for icons: <Ionicons name="home-outline" size={24} />
3. API calls: const response = await api.get('/endpoint'); return response.data;
4. Haptics: hapticSuccess() on success, hapticError() on error, hapticSelection() on tap
5. Navigation: useRouter() from expo-router, router.push('/path')
6. Auth check: useAuth() hook returns { isAuthenticated, user }
7. Loading: <ActivityIndicator size="large" color="#2563eb" />
8. State: Use useState and useEffect (NOT react-query)
9. Form state: const [form, setForm] = useState({ field: '' })
`)

	return ctx.String()
}

// extractInstalledPackages reads package.json and extracts dependencies
func (e *Executioner) extractInstalledPackages() string {
	pkgPath := filepath.Join(e.workDir, "mobile", "package.json")
	content, err := os.ReadFile(pkgPath)
	if err != nil {
		return ""
	}

	var pkg struct {
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal(content, &pkg); err != nil {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("Dependencies:\n")
	for name, version := range pkg.Dependencies {
		sb.WriteString(fmt.Sprintf("  - %s: %s\n", name, version))
	}

	if len(pkg.DevDependencies) > 0 {
		sb.WriteString("\nDevDependencies:\n")
		for name, version := range pkg.DevDependencies {
			sb.WriteString(fmt.Sprintf("  - %s: %s\n", name, version))
		}
	}

	return sb.String()
}

// extractModulePath reads go.mod and extracts the module path.
func (e *Executioner) extractModulePath() string {
	goModPath := filepath.Join(e.workDir, "backend", "go.mod")
	content, err := os.ReadFile(goModPath)
	if err != nil {
		return ""
	}

	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "module ") {
			return strings.TrimPrefix(line, "module ")
		}
	}
	return ""
}

// readSampleFile reads a file from the work directory.
func (e *Executioner) readSampleFile(relativePath string) string {
	fullPath := filepath.Join(e.workDir, relativePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return ""
	}
	return string(content)
}

// readSampleFileHead reads first N lines of a file.
func (e *Executioner) readSampleFileHead(relativePath string, maxLines int) string {
	fullPath := filepath.Join(e.workDir, relativePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return ""
	}

	lines := strings.Split(string(content), "\n")
	if len(lines) > maxLines {
		lines = lines[:maxLines]
		lines = append(lines, "// ... (truncated for brevity)")
	}
	return strings.Join(lines, "\n")
}

// listDirectory lists .go files in a directory.
func (e *Executioner) listDirectory(ctx *strings.Builder, relativePath, label string) {
	fullPath := filepath.Join(e.workDir, relativePath)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return
	}

	ctx.WriteString(fmt.Sprintf("%s:\n", label))
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".go") {
			ctx.WriteString(fmt.Sprintf("  - %s\n", entry.Name()))
		}
	}
}

// listMobileDirectory lists .ts/.tsx files in a directory.
func (e *Executioner) listMobileDirectory(ctx *strings.Builder, relativePath, label string) {
	fullPath := filepath.Join(e.workDir, relativePath)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return
	}

	ctx.WriteString(fmt.Sprintf("%s:\n", label))
	for _, entry := range entries {
		if !entry.IsDir() && (strings.HasSuffix(entry.Name(), ".ts") || strings.HasSuffix(entry.Name(), ".tsx")) {
			ctx.WriteString(fmt.Sprintf("  - %s\n", entry.Name()))
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// RunShellCommand executes an arbitrary shell command and returns its output.
func (e *Executioner) RunShellCommand(ctx context.Context, command string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, e.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "sh", "-c", command)
	cmd.Dir = e.workDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	output := stdout.String()

	if err != nil {
		return "", fmt.Errorf("command failed: %w\nstdout: %s\nstderr: %s",
			err, output, stderr.String())
	}

	return strings.TrimSpace(output), nil
}
