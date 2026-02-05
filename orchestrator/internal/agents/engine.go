package agents

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"time"
)

// Engine is the code generation agent (DeepSeek-V3 / GLM-4).
type Engine struct {
	apiKey  string
	apiURL  string
	model   string
	timeout time.Duration
	client  *http.Client
}

// EngineConfig holds configuration for the Engine agent.
type EngineConfig struct {
	APIKey  string
	APIURL  string
	Model   string
	Timeout time.Duration // Default: 300s
}

func NewEngine(cfg EngineConfig) *Engine {
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = 300 * time.Second // Default 5 minutes
	}
	return &Engine{
		apiKey:  cfg.APIKey,
		apiURL:  cfg.APIURL,
		model:   cfg.Model,
		timeout: timeout,
		client:  &http.Client{Timeout: timeout},
	}
}

func (e *Engine) Name() string {
	return "Engine"
}

func (e *Engine) Execute(ctx context.Context, prompt string) (string, error) {
	messages := []ChatMessage{
		{
			Role:    "system",
			Content: "You are an expert full-stack engineer. Generate clean, production-ready code. Follow best practices for Go, TypeScript, and React Native. Output only code and necessary explanations. No markdown fences unless showing file contents.",
		},
		{
			Role:    "user",
			Content: prompt,
		},
	}

	return e.callWithRetry(ctx, messages, 3)
}

func (e *Engine) callWithRetry(ctx context.Context, messages []ChatMessage, maxRetries int) (string, error) {
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(math.Pow(2, float64(attempt))) * time.Second
			select {
			case <-ctx.Done():
				return "", ctx.Err()
			case <-time.After(backoff):
			}
		}

		result, err := e.call(ctx, messages)
		if err == nil {
			return result, nil
		}
		lastErr = err
	}

	return "", fmt.Errorf("engine failed after %d retries: %w", maxRetries, lastErr)
}

func (e *Engine) call(ctx context.Context, messages []ChatMessage) (string, error) {
	reqBody := ChatRequest{
		Model:       e.model,
		Messages:    messages,
		Temperature: 0.1,
		MaxTokens:   4096,
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
