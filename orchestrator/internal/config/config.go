package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Engine agent (Planning) - recommend DeepSeek-Reasoner for better plans
	EngineAPIKey  string
	EngineAPIURL  string
	EngineModel   string
	EngineTimeout time.Duration

	// Executioner agent - configurable mode
	ExecutionerMode        string        // "api" or "cli"
	ExecutionerAPIKey      string        // For API mode
	ExecutionerAPIURL      string        // For API mode
	ExecutionerModel       string        // For API mode
	ExecutionerTimeout     time.Duration // Timeout for both modes
	ExecutionerFallbackCLI bool          // Enable automatic fallback to Claude CLI

	// Debugger agent
	DebuggerAPIKey  string
	DebuggerAPIURL  string
	DebuggerModel   string
	DebuggerTimeout time.Duration

	// Project
	ProjectRoot string
	TaskFile    string

	// Limits
	MaxRetries     int
	TestCommandGo  string
	TestCommandWeb string

	// Logging
	LogDir string

	// Git-Claw (Version Control)
	AutoCommit bool
	GitPush    bool // Push after all tasks complete

	// Coolify Deploy
	CoolifyEnabled bool
	CoolifyURL     string
	CoolifyToken   string
	CoolifyServer  string // Server UUID
	CoolifyProject string // Project UUID
	CoolifyEnv     string // Environment UUID

	// GitHub (for auto repo creation)
	GitHubPAT      string
	GitHubOwner    string
	GitHubRepoName string
}

func Load() *Config {
	return &Config{
		// Engine - recommend deepseek-reasoner for planning
		EngineAPIKey:  getEnv("ENGINE_API_KEY", ""),
		EngineAPIURL:  getEnv("ENGINE_API_URL", "https://api.deepseek.com/v1/chat/completions"),
		EngineModel:   getEnv("ENGINE_MODEL", "deepseek-reasoner"), // Changed default to reasoner
		EngineTimeout: getDurationEnv("ENGINE_TIMEOUT", 300*time.Second),

		// Executioner - GLM-4.7 for coding, with CLI fallback
		ExecutionerMode:        getEnv("EXECUTIONER_MODE", "api"),
		ExecutionerAPIKey:      getEnv("EXECUTIONER_API_KEY", ""),
		ExecutionerAPIURL:      getEnv("EXECUTIONER_API_URL", "https://api.z.ai/api/paas/v4/chat/completions"),
		ExecutionerModel:       getEnv("EXECUTIONER_MODEL", "glm-4.7"),
		ExecutionerTimeout:     getDurationEnv("EXECUTIONER_TIMEOUT", 600*time.Second),
		ExecutionerFallbackCLI: getEnv("EXECUTIONER_FALLBACK_CLI", "true") == "true", // Enabled by default

		// Debugger
		DebuggerAPIKey:  getEnv("DEBUGGER_API_KEY", ""),
		DebuggerAPIURL:  getEnv("DEBUGGER_API_URL", "https://api.z.ai/api/paas/v4/chat/completions"),
		DebuggerModel:   getEnv("DEBUGGER_MODEL", "glm-4.7"),
		DebuggerTimeout: getDurationEnv("DEBUGGER_TIMEOUT", 180*time.Second),

		// Project
		ProjectRoot: getEnv("PROJECT_ROOT", ".."),
		TaskFile:    getEnv("TASK_FILE", "../task_list.json"),

		// Limits
		MaxRetries:     getIntEnv("MAX_RETRIES", 5),
		TestCommandGo:  "cd backend && go build ./...",
		TestCommandWeb: "cd mobile && npx tsc --noEmit",

		// Logging
		LogDir: getEnv("LOG_DIR", ""),

		// Git-Claw
		AutoCommit: getEnv("AUTO_COMMIT", "") == "true",
		GitPush:    getEnv("GIT_PUSH", "") == "true",

		// Coolify Deploy
		CoolifyEnabled: getEnv("COOLIFY_ENABLED", "") == "true",
		CoolifyURL:     getEnv("COOLIFY_URL", "http://89.47.113.196:8000"),
		CoolifyToken:   getEnv("COOLIFY_TOKEN", ""),
		CoolifyServer:  getEnv("COOLIFY_SERVER", "lgs0s8kkggk0c88ogws0wk44"),
		CoolifyProject: getEnv("COOLIFY_PROJECT", "hwcw4gw0scs40888okkcs8ws"),
		CoolifyEnv:     getEnv("COOLIFY_ENV", "cgskc4o4ogc0gs84840os4kg"),

		// GitHub
		GitHubPAT:      getEnv("GITHUB_PAT", ""),
		GitHubOwner:    getEnv("GITHUB_OWNER", ""),
		GitHubRepoName: getEnv("GITHUB_REPO_NAME", ""),
	}
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if secs, err := strconv.Atoi(val); err == nil {
			return time.Duration(secs) * time.Second
		}
	}
	return fallback
}

func getIntEnv(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return fallback
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
