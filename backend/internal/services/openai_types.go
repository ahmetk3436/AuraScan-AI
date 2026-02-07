package services

type openAIRequest struct {
	Model          string           `json:"model"`
	Messages       []openAIMessage  `json:"messages"`
	MaxTokens      int              `json:"max_tokens,omitempty"`
	Temperature    float64          `json:"temperature,omitempty"`
	ResponseFormat *responseFormat  `json:"response_format,omitempty"`
}

type openAIMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

type responseFormat struct {
	Type string `json:"type"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}
