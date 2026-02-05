package deploy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

// GitClaw handles Git operations and Coolify deployment
type GitClaw struct {
	workDir     string
	githubPAT   string
	githubOwner string
	repoName    string

	coolifyURL     string
	coolifyToken   string
	coolifyServer  string
	coolifyProject string
	coolifyEnv     string

	client *http.Client
}

// GitClawConfig holds configuration for GitClaw
type GitClawConfig struct {
	WorkDir     string
	GitHubPAT   string
	GitHubOwner string
	RepoName    string

	CoolifyURL     string
	CoolifyToken   string
	CoolifyServer  string
	CoolifyProject string
	CoolifyEnv     string
}

// NewGitClaw creates a new GitClaw instance
func NewGitClaw(cfg GitClawConfig) *GitClaw {
	return &GitClaw{
		workDir:        cfg.WorkDir,
		githubPAT:      cfg.GitHubPAT,
		githubOwner:    cfg.GitHubOwner,
		repoName:       cfg.RepoName,
		coolifyURL:     cfg.CoolifyURL,
		coolifyToken:   cfg.CoolifyToken,
		coolifyServer:  cfg.CoolifyServer,
		coolifyProject: cfg.CoolifyProject,
		coolifyEnv:     cfg.CoolifyEnv,
		client:         &http.Client{Timeout: 60 * time.Second},
	}
}

// InitRepo initializes git repository if needed
func (g *GitClaw) InitRepo(ctx context.Context) error {
	// Check if already a git repo
	cmd := exec.CommandContext(ctx, "git", "rev-parse", "--git-dir")
	cmd.Dir = g.workDir
	if err := cmd.Run(); err != nil {
		// Not a git repo, initialize
		log.Println("[GIT-CLAW] Initializing git repository...")
		initCmd := exec.CommandContext(ctx, "git", "init")
		initCmd.Dir = g.workDir
		if err := initCmd.Run(); err != nil {
			return fmt.Errorf("git init failed: %w", err)
		}
	}
	return nil
}

// CreateGitHubRepo creates a private GitHub repository
func (g *GitClaw) CreateGitHubRepo(ctx context.Context, description string) error {
	if g.githubPAT == "" || g.githubOwner == "" || g.repoName == "" {
		return fmt.Errorf("GitHub credentials not configured")
	}

	log.Printf("[GIT-CLAW] Creating GitHub repo: %s/%s", g.githubOwner, g.repoName)

	reqBody := map[string]interface{}{
		"name":        g.repoName,
		"description": description,
		"private":     true,
		"auto_init":   false,
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.github.com/user/repos", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+g.githubPAT)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 422 {
		// Repo already exists
		log.Println("[GIT-CLAW] Repository already exists")
		return nil
	}

	if resp.StatusCode != 201 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitHub API returned %d: %s", resp.StatusCode, string(body))
	}

	log.Println("[GIT-CLAW] Repository created successfully")
	return nil
}

// SetupRemote configures git remote
func (g *GitClaw) SetupRemote(ctx context.Context) error {
	remoteURL := fmt.Sprintf("https://%s@github.com/%s/%s.git", g.githubPAT, g.githubOwner, g.repoName)

	// Check if remote exists
	cmd := exec.CommandContext(ctx, "git", "remote", "get-url", "origin")
	cmd.Dir = g.workDir
	if err := cmd.Run(); err != nil {
		// Remote doesn't exist, add it
		addCmd := exec.CommandContext(ctx, "git", "remote", "add", "origin", remoteURL)
		addCmd.Dir = g.workDir
		if err := addCmd.Run(); err != nil {
			return fmt.Errorf("git remote add failed: %w", err)
		}
		log.Println("[GIT-CLAW] Remote 'origin' added")
	} else {
		// Remote exists, update it
		setCmd := exec.CommandContext(ctx, "git", "remote", "set-url", "origin", remoteURL)
		setCmd.Dir = g.workDir
		if err := setCmd.Run(); err != nil {
			return fmt.Errorf("git remote set-url failed: %w", err)
		}
		log.Println("[GIT-CLAW] Remote 'origin' updated")
	}

	return nil
}

// CommitAll stages and commits all changes
func (g *GitClaw) CommitAll(ctx context.Context, message string) error {
	// Stage all changes
	addCmd := exec.CommandContext(ctx, "git", "add", "-A")
	addCmd.Dir = g.workDir
	if err := addCmd.Run(); err != nil {
		return fmt.Errorf("git add failed: %w", err)
	}

	// Check if there are changes to commit
	statusCmd := exec.CommandContext(ctx, "git", "status", "--porcelain")
	statusCmd.Dir = g.workDir
	output, err := statusCmd.Output()
	if err != nil {
		return fmt.Errorf("git status failed: %w", err)
	}

	if len(strings.TrimSpace(string(output))) == 0 {
		log.Println("[GIT-CLAW] No changes to commit")
		return nil
	}

	// Commit
	commitCmd := exec.CommandContext(ctx, "git", "commit", "-m", message)
	commitCmd.Dir = g.workDir
	if err := commitCmd.Run(); err != nil {
		return fmt.Errorf("git commit failed: %w", err)
	}

	log.Println("[GIT-CLAW] Changes committed")
	return nil
}

// Push pushes to remote
func (g *GitClaw) Push(ctx context.Context) error {
	log.Println("[GIT-CLAW] Pushing to remote...")

	// First, try to push with -u to set upstream
	pushCmd := exec.CommandContext(ctx, "git", "push", "-u", "origin", "main")
	pushCmd.Dir = g.workDir
	var stderr bytes.Buffer
	pushCmd.Stderr = &stderr

	if err := pushCmd.Run(); err != nil {
		// Try master if main fails
		pushCmd2 := exec.CommandContext(ctx, "git", "push", "-u", "origin", "master")
		pushCmd2.Dir = g.workDir
		pushCmd2.Stderr = &stderr
		if err := pushCmd2.Run(); err != nil {
			return fmt.Errorf("git push failed: %w\nstderr: %s", err, stderr.String())
		}
	}

	log.Println("[GIT-CLAW] Push completed")
	return nil
}

// DeployCoolify deploys to Coolify
func (g *GitClaw) DeployCoolify(ctx context.Context) error {
	if g.coolifyToken == "" || g.coolifyURL == "" {
		return fmt.Errorf("Coolify credentials not configured")
	}

	log.Println("[GIT-CLAW] Creating Coolify application...")

	// Step 1: Create the application
	appUUID, err := g.createCoolifyApp(ctx)
	if err != nil {
		return fmt.Errorf("create app failed: %w", err)
	}

	// Step 2: Add environment variables
	if err := g.addCoolifyEnvVars(ctx, appUUID); err != nil {
		log.Printf("[GIT-CLAW] Warning: Failed to add env vars: %v", err)
	}

	// Step 3: Deploy
	log.Println("[GIT-CLAW] Triggering deployment...")
	deployURL := fmt.Sprintf("%s/api/v1/deploy", g.coolifyURL)

	reqBody := map[string]interface{}{
		"uuid":  appUUID,
		"force": true,
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", deployURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create deploy request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+g.coolifyToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return fmt.Errorf("deploy request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("deploy API returned %d: %s", resp.StatusCode, string(respBody))
	}

	log.Printf("[GIT-CLAW] Deployment triggered for app: %s", appUUID)
	return nil
}

// createCoolifyApp creates an application in Coolify
func (g *GitClaw) createCoolifyApp(ctx context.Context) (string, error) {
	appURL := fmt.Sprintf("%s/api/v1/applications/public", g.coolifyURL)

	reqBody := map[string]interface{}{
		"project_uuid":       g.coolifyProject,
		"server_uuid":        g.coolifyServer,
		"environment_name":   "production",
		"git_repository":     fmt.Sprintf("%s/%s", g.githubOwner, g.repoName), // owner/repo format
		"git_branch":         "main",
		"build_pack":         "dockerfile",
		"ports_exposes":      "8080",
		"ports_mappings":     []string{"8081:8080"},
		"base_directory":     "/backend",
		"dockerfile_location": "/Dockerfile",
		"name":               g.repoName,
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", appURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+g.coolifyToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		return "", fmt.Errorf("Coolify API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		UUID string `json:"uuid"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	log.Printf("[GIT-CLAW] Created Coolify app: %s", result.UUID)
	return result.UUID, nil
}

// addCoolifyEnvVars adds environment variables to the app
func (g *GitClaw) addCoolifyEnvVars(ctx context.Context, appUUID string) error {
	envURL := fmt.Sprintf("%s/api/v1/applications/%s/envs", g.coolifyURL, appUUID)

	// Add common env vars
	envVars := []map[string]interface{}{
		{"key": "DB_HOST", "value": "to0o48co4occowcsccscwws4", "is_preview": false},
		{"key": "DB_PORT", "value": "5432", "is_preview": false},
		{"key": "DB_NAME", "value": g.repoName, "is_preview": false},
		{"key": "DB_USER", "value": "postgres", "is_preview": false},
		{"key": "DB_PASSWORD", "value": "postgres", "is_preview": false},
		{"key": "JWT_SECRET", "value": "your-super-secret-jwt-key-32-chars", "is_preview": false},
	}

	for _, env := range envVars {
		body, _ := json.Marshal(env)
		req, err := http.NewRequestWithContext(ctx, "POST", envURL, bytes.NewReader(body))
		if err != nil {
			continue
		}

		req.Header.Set("Authorization", "Bearer "+g.coolifyToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := g.client.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()
	}

	return nil
}

// FullDeploy runs the complete deployment pipeline
func (g *GitClaw) FullDeploy(ctx context.Context, projectDescription string) error {
	// 1. Init git if needed
	if err := g.InitRepo(ctx); err != nil {
		return fmt.Errorf("init repo: %w", err)
	}

	// 2. Create GitHub repo
	if err := g.CreateGitHubRepo(ctx, projectDescription); err != nil {
		return fmt.Errorf("create GitHub repo: %w", err)
	}

	// 3. Setup remote
	if err := g.SetupRemote(ctx); err != nil {
		return fmt.Errorf("setup remote: %w", err)
	}

	// 4. Commit all changes
	commitMsg := fmt.Sprintf("chore: Autonomous build complete\n\nGenerated by orchestrator on %s",
		time.Now().Format("2006-01-02 15:04:05"))
	if err := g.CommitAll(ctx, commitMsg); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	// 5. Push to remote
	if err := g.Push(ctx); err != nil {
		return fmt.Errorf("push: %w", err)
	}

	// 6. Deploy to Coolify
	if g.coolifyToken != "" {
		if err := g.DeployCoolify(ctx); err != nil {
			return fmt.Errorf("Coolify deploy: %w", err)
		}
	}

	log.Println("[GIT-CLAW] Full deployment completed!")
	return nil
}
