package agents

import "context"

// Agent is the interface all LLM agents must implement.
type Agent interface {
	Name() string
	Execute(ctx context.Context, prompt string) (string, error)
}

// ChatMessage represents a message in a conversation.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest is the request body for chat completion APIs.
type ChatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature float64       `json:"temperature,omitempty"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
}

// ChatResponse is the response from chat completion APIs.
type ChatResponse struct {
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
}

// DebugResult is the structured output from the debugger agent.
type DebugResult struct {
	Analysis   string `json:"analysis"`
	FixType    string `json:"fix_type"`    // "code_patch" | "command" | "config_change"
	FixContent string `json:"fix_content"` // The actual fix to apply
}
