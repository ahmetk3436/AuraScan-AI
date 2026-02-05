package agents

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Debugger analyzes error logs and produces fixes.
type Debugger struct {
	apiKey  string
	apiURL  string
	model   string
	timeout time.Duration
	workDir string // Added for context injection
	client  *http.Client
}

// DebuggerConfig holds configuration for the Debugger agent.
type DebuggerConfig struct {
	APIKey  string
	APIURL  string
	Model   string
	Timeout time.Duration // Default: 180s
	WorkDir string        // Project root for context injection
}

func NewDebugger(cfg DebuggerConfig) *Debugger {
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = 180 * time.Second // Default 3 minutes
	}
	return &Debugger{
		apiKey:  cfg.APIKey,
		apiURL:  cfg.APIURL,
		model:   cfg.Model,
		timeout: timeout,
		workDir: cfg.WorkDir,
		client:  &http.Client{Timeout: timeout},
	}
}

func (d *Debugger) Name() string {
	return "Debugger"
}

func (d *Debugger) Execute(ctx context.Context, prompt string) (string, error) {
	// Build context-aware system prompt
	codebaseContext := d.buildCodebaseContext()

	systemPrompt := fmt.Sprintf(`You are an expert debugger. Analyze the error log and source code provided.

%s

IMPORTANT: When suggesting fixes, you MUST follow the EXACT patterns from the codebase context above.
- Use the EXACT import paths shown (e.g., the module path from go.mod)
- Use the EXACT function signatures and patterns from sample files
- Do NOT introduce new frameworks or patterns not in the codebase

Output a JSON object with exactly these fields:
{
  "analysis": "Brief description of the root cause",
  "fix_type": "code_patch" | "command" | "config_change",
  "fix_content": "The exact fix to apply (code diff, command to run, or config to change)"
}
Only output valid JSON. No additional text.`, codebaseContext)

	messages := []ChatMessage{
		{
			Role:    "system",
			Content: systemPrompt,
		},
		{
			Role:    "user",
			Content: prompt,
		},
	}

	return d.call(ctx, messages)
}

// buildCodebaseContext provides essential context for accurate fixes
func (d *Debugger) buildCodebaseContext() string {
	if d.workDir == "" {
		return ""
	}

	var ctx strings.Builder
	ctx.WriteString("=== CODEBASE CONTEXT FOR ACCURATE FIXES ===\n\n")

	// 1. Go module path (CRITICAL for imports)
	goModPath := filepath.Join(d.workDir, "backend", "go.mod")
	if content, err := os.ReadFile(goModPath); err == nil {
		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "module ") {
				modulePath := strings.TrimPrefix(line, "module ")
				ctx.WriteString(fmt.Sprintf("Go Module: %s\n", modulePath))
				ctx.WriteString(fmt.Sprintf("Import prefix for internal packages: %s/internal/...\n\n", modulePath))
				break
			}
		}
	}

	// 2. Framework requirements
	ctx.WriteString(`Framework Requirements:
- Backend: Go-Fiber v2 + GORM (NOT chi, NOT sqlx, NOT gorilla/mux)
- Mobile: Expo SDK 54 + React Native 0.81 + NativeWind v4 (NO react-query)

`)

	// 3. Sample service pattern (brief)
	serviceSample := d.readFileHead("backend/internal/services/pet_service.go", 30)
	if serviceSample != "" {
		ctx.WriteString("=== SERVICE PATTERN (pet_service.go excerpt) ===\n")
		ctx.WriteString(serviceSample)
		ctx.WriteString("\n\n")
	}

	// 4. Sample handler pattern (brief)
	handlerSample := d.readFileHead("backend/internal/handlers/pet_handler.go", 40)
	if handlerSample != "" {
		ctx.WriteString("=== HANDLER PATTERN (pet_handler.go excerpt) ===\n")
		ctx.WriteString(handlerSample)
		ctx.WriteString("\n\n")
	}

	// 5. Mobile API client pattern
	apiSample := d.readFileHead("mobile/lib/api.ts", 30)
	if apiSample != "" {
		ctx.WriteString("=== MOBILE API CLIENT (api.ts excerpt) ===\n")
		ctx.WriteString(apiSample)
		ctx.WriteString("\n\n")
	}

	// 6. Haptics pattern
	hapticsSample := d.readFileHead("mobile/lib/haptics.ts", 20)
	if hapticsSample != "" {
		ctx.WriteString("=== HAPTICS (haptics.ts) ===\n")
		ctx.WriteString(hapticsSample)
		ctx.WriteString("\n\n")
	}

	ctx.WriteString(`=== KEY CONVENTIONS ===
- Backend services: struct with db *gorm.DB field, New*Service(db) constructor
- Backend handlers: struct with service field, New*Handler(service) constructor
- Mobile: Use useState/useEffect (NOT react-query)
- Mobile haptics: hapticSuccess(), hapticError(), hapticSelection()
`)

	return ctx.String()
}

// readFileHead reads first N lines of a file
func (d *Debugger) readFileHead(relativePath string, maxLines int) string {
	fullPath := filepath.Join(d.workDir, relativePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return ""
	}

	lines := strings.Split(string(content), "\n")
	if len(lines) > maxLines {
		lines = lines[:maxLines]
		lines = append(lines, "// ... (truncated)")
	}
	return strings.Join(lines, "\n")
}

// ParseDebugResult parses the debugger's JSON output into a DebugResult.
func (d *Debugger) ParseDebugResult(output string) (*DebugResult, error) {
	var result DebugResult
	if err := json.Unmarshal([]byte(output), &result); err != nil {
		return nil, fmt.Errorf("failed to parse debug result: %w\nraw output: %s", err, output)
	}
	return &result, nil
}

func (d *Debugger) call(ctx context.Context, messages []ChatMessage) (string, error) {
	reqBody := ChatRequest{
		Model:       d.model,
		Messages:    messages,
		Temperature: 0.0,
		MaxTokens:   2048,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, d.apiURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+d.apiKey)

	resp, err := d.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API call failed: %w", err)
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
