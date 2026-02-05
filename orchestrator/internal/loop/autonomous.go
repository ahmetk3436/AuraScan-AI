package loop

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/orchestrator/internal/agents"
	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/orchestrator/internal/deploy"
	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/orchestrator/internal/task"
)

// AgentSet holds all available agents.
type AgentSet struct {
	Engine      *agents.Engine
	Executioner *agents.Executioner
	Debugger    *agents.Debugger
}

// LoopConfig configures the autonomous loop.
type LoopConfig struct {
	MaxRetries         int
	DefaultTestCommand string
	ProjectDir         string
	LogDir             string // Directory for detailed logs
	AutoCommit         bool   // Global auto-commit setting
	FallbackToCLI      bool   // Enable Claude CLI fallback after repeated failures

	// Deploy configuration (Git-Claw)
	DeployEnabled  bool
	GitHubPAT      string
	GitHubOwner    string
	GitHubRepoName string
	CoolifyURL     string
	CoolifyToken   string
	CoolifyServer  string
	CoolifyProject string
	CoolifyEnv     string
}

// RunAutonomousLoop executes the Plan → Execute → Test → Correct → Deploy loop.
func RunAutonomousLoop(ctx context.Context, t *task.Task, agentSet *AgentSet, cfg *LoopConfig) error {
	startTime := time.Now()
	logger := newTaskLogger(cfg.LogDir, t.ID)
	defer logger.Close()

	logger.Log("LOOP", "Starting task: %s", t.Title)
	logger.Log("LOOP", "Description: %s", t.Description)
	logger.Log("LOOP", "Executioner mode: %s", agentSet.Executioner.GetMode())

	// Reset failure counter at task start
	agentSet.Executioner.ResetFailures()

	// Phase 1: PLAN
	logger.Log("PLAN", "Generating implementation plan...")
	planPrompt := buildPlanPrompt(t, cfg.ProjectDir)

	plan, err := agentSet.Engine.Execute(ctx, planPrompt)
	if err != nil {
		logger.Log("PLAN", "ERROR: %v", err)
		return fmt.Errorf("planning failed: %w", err)
	}
	logger.Log("PLAN", "Plan generated (%d chars)", len(plan))
	logger.LogContent("PLAN_OUTPUT", plan)

	// Phase 2: EXECUTE
	logger.Log("EXEC", "Implementing plan...")
	execPrompt := buildExecPrompt(plan, t)

	execResult, err := agentSet.Executioner.Execute(ctx, execPrompt)
	if err != nil {
		logger.Log("EXEC", "ERROR: %v", err)
		return fmt.Errorf("execution failed: %w", err)
	}
	logger.Log("EXEC", "Execution complete (%d chars output)", len(execResult))
	logger.LogContent("EXEC_OUTPUT", execResult)

	// Determine test command (per-task overrides global)
	testCommand := cfg.DefaultTestCommand
	if t.TestCommand != "" {
		testCommand = t.TestCommand
		logger.Log("TEST", "Using task-specific test command: %s", testCommand)
	}

	// Phase 3-4: TEST → CORRECT (retry loop)
	var attempts int
	for attempt := 1; attempt <= cfg.MaxRetries; attempt++ {
		attempts = attempt
		logger.Log("TEST", "Running tests (attempt %d/%d): %s", attempt, cfg.MaxRetries, testCommand)

		testOutput, testErr := agentSet.Executioner.RunShellCommand(ctx, testCommand)
		if testErr == nil {
			logger.Log("TEST", "Tests PASSED!")
			logger.LogContent("TEST_OUTPUT", testOutput)

			// Reset failure counter on success
			agentSet.Executioner.ResetFailures()

			// Auto-commit if enabled
			if shouldAutoCommit(t, cfg) {
				logger.Log("GIT", "Auto-committing changes...")
				if commitErr := autoCommit(ctx, agentSet.Executioner, t, cfg.ProjectDir); commitErr != nil {
					logger.Log("GIT", "Auto-commit failed: %v", commitErr)
				} else {
					logger.Log("GIT", "Changes committed successfully")
				}
			}

			t.Attempts = attempts
			t.Duration = time.Since(startTime).Round(time.Second).String()
			return nil
		}

		logger.Log("TEST", "Tests FAILED: %v", testErr)
		logger.LogContent("TEST_ERROR", testOutput)

		// Check if we should fallback to Claude CLI
		if cfg.FallbackToCLI && agentSet.Executioner.IncrementFailures() {
			logger.Log("FALLBACK", "API mode failed %d times, switching to Claude CLI", 3)
			agentSet.Executioner.SwitchToCLI()

			// Re-execute with Claude CLI
			logger.Log("EXEC", "Re-implementing with Claude CLI...")
			execResult, err = agentSet.Executioner.Execute(ctx, execPrompt)
			if err != nil {
				logger.Log("EXEC", "Claude CLI execution failed: %v", err)
			} else {
				logger.Log("EXEC", "Claude CLI execution complete")
				continue // Go to next test attempt
			}
		}

		if attempt == cfg.MaxRetries {
			t.Attempts = attempts
			t.Duration = time.Since(startTime).Round(time.Second).String()
			return fmt.Errorf("tests failed after %d retries: %w", cfg.MaxRetries, testErr)
		}

		// Phase 4: CORRECT
		logger.Log("DEBUG", "Analyzing failure and generating fix...")
		debugPrompt := buildDebugPrompt(testCommand, testOutput, execResult)

		fix, err := agentSet.Debugger.Execute(ctx, debugPrompt)
		if err != nil {
			logger.Log("DEBUG", "Debugger error: %v", err)
			continue
		}
		logger.Log("DEBUG", "Fix generated")
		logger.LogContent("FIX_OUTPUT", fix)

		// Apply fix
		logger.Log("FIX", "Applying fix...")
		fixPrompt := fmt.Sprintf("Apply the following fix to the codebase:\n\n%s", fix)

		execResult, err = agentSet.Executioner.Execute(ctx, fixPrompt)
		if err != nil {
			logger.Log("FIX", "Fix application failed: %v", err)
			continue
		}
		logger.Log("FIX", "Fix applied successfully")
	}

	t.Attempts = attempts
	t.Duration = time.Since(startTime).Round(time.Second).String()
	return fmt.Errorf("autonomous loop exhausted all retries")
}

// RunContinuous picks tasks from the task list and runs them through the loop.
func RunContinuous(ctx context.Context, taskMgr *task.Manager, agentSet *AgentSet, cfg *LoopConfig) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		t, err := taskMgr.NextPendingTask()
		if err != nil {
			log.Printf("[LOOP] No pending tasks: %v", err)
			return nil
		}

		log.Printf("[LOOP] ════════════════════════════════════════")
		log.Printf("[LOOP] Picked task: %s (%s)", t.Title, t.ID)
		log.Printf("[LOOP] ════════════════════════════════════════")

		if err := taskMgr.UpdateStatus(t.ID, "in_progress"); err != nil {
			log.Printf("[LOOP] Failed to update task status: %v", err)
		}

		// Check if this is a deployment task
		if t.IsDeployment {
			if err := RunDeploymentTask(ctx, t, cfg); err != nil {
				log.Printf("[LOOP] Deployment FAILED: %v", err)
				if setErr := taskMgr.SetError(t.ID, err.Error()); setErr != nil {
					log.Printf("[LOOP] Failed to record error: %v", setErr)
				}
				continue
			}
		} else {
			if err := RunAutonomousLoop(ctx, t, agentSet, cfg); err != nil {
				log.Printf("[LOOP] Task FAILED: %v", err)
				if setErr := taskMgr.SetError(t.ID, err.Error()); setErr != nil {
					log.Printf("[LOOP] Failed to record error: %v", setErr)
				}
				continue
			}
		}

		if err := taskMgr.UpdateStatus(t.ID, "completed"); err != nil {
			log.Printf("[LOOP] Failed to mark task as completed: %v", err)
		}

		log.Printf("[LOOP] Task COMPLETED: %s (attempts: %d, duration: %s)", t.Title, t.Attempts, t.Duration)
	}
}

// RunDeploymentTask executes the Git-Claw deployment pipeline.
func RunDeploymentTask(ctx context.Context, t *task.Task, cfg *LoopConfig) error {
	startTime := time.Now()
	log.Println("[DEPLOY] Starting deployment task...")

	// Create GitClaw instance
	gitClaw := deploy.NewGitClaw(deploy.GitClawConfig{
		WorkDir:        cfg.ProjectDir,
		GitHubPAT:      cfg.GitHubPAT,
		GitHubOwner:    cfg.GitHubOwner,
		RepoName:       cfg.GitHubRepoName,
		CoolifyURL:     cfg.CoolifyURL,
		CoolifyToken:   cfg.CoolifyToken,
		CoolifyServer:  cfg.CoolifyServer,
		CoolifyProject: cfg.CoolifyProject,
		CoolifyEnv:     cfg.CoolifyEnv,
	})

	// Run full deployment
	projectDesc := fmt.Sprintf("%s - Generated by Autonomous App Factory", t.Title)
	if err := gitClaw.FullDeploy(ctx, projectDesc); err != nil {
		return fmt.Errorf("deployment failed: %w", err)
	}

	t.Attempts = 1
	t.Duration = time.Since(startTime).Round(time.Second).String()
	log.Printf("[DEPLOY] Deployment completed in %s", t.Duration)
	return nil
}

// Helper functions

func buildPlanPrompt(t *task.Task, projectDir string) string {
	return fmt.Sprintf(`Create a detailed implementation plan for the following task.

PROJECT DIRECTORY: %s

TASK TITLE: %s

TASK DESCRIPTION:
%s

Output a step-by-step plan with:
1. Files to create or modify (full paths from project root)
2. Code changes needed for each file
3. Any dependencies or imports required
4. Test criteria to verify the implementation

Be specific about file paths and code structure. Follow existing patterns in the codebase.`,
		projectDir, t.Title, t.Description)
}

func buildExecPrompt(plan string, t *task.Task) string {
	return fmt.Sprintf(`Implement the following plan. Create or modify files as needed.

PLAN:
%s

TASK: %s
DESCRIPTION: %s

Important:
- Create all necessary files with complete contents
- Follow the existing code patterns and conventions
- Ensure all imports are correct
- Do not use placeholder code or "..."`,
		plan, t.Title, t.Description)
}

func buildDebugPrompt(testCommand, testOutput, execResult string) string {
	return fmt.Sprintf(`The following test command failed:

COMMAND: %s

ERROR OUTPUT:
%s

PREVIOUS EXECUTION RESULT:
%s

Analyze the error and provide a specific fix. Include:
1. Root cause analysis
2. Exact code changes needed
3. File paths to modify`,
		testCommand, testOutput, execResult)
}

func shouldAutoCommit(t *task.Task, cfg *LoopConfig) bool {
	// Task-level setting overrides global
	if t.AutoCommit {
		return true
	}
	return cfg.AutoCommit
}

func autoCommit(ctx context.Context, exec *agents.Executioner, t *task.Task, projectDir string) error {
	// Stage all changes
	_, err := exec.RunShellCommand(ctx, "git add -A")
	if err != nil {
		return fmt.Errorf("git add failed: %w", err)
	}

	// Commit with task info
	commitMsg := fmt.Sprintf("feat(%s): %s\n\nAuto-committed by orchestrator after successful test.\nTask ID: %s",
		t.ID, t.Title, t.ID)
	_, err = exec.RunShellCommand(ctx, fmt.Sprintf("git commit -m %q", commitMsg))
	if err != nil {
		return fmt.Errorf("git commit failed: %w", err)
	}

	return nil
}

// TaskLogger writes detailed logs for each task execution
type TaskLogger struct {
	file *os.File
}

func newTaskLogger(logDir, taskID string) *TaskLogger {
	if logDir == "" {
		return &TaskLogger{} // No-op logger
	}

	if err := os.MkdirAll(logDir, 0755); err != nil {
		log.Printf("Failed to create log dir: %v", err)
		return &TaskLogger{}
	}

	logFile := filepath.Join(logDir, fmt.Sprintf("%s_%s.log", taskID, time.Now().Format("20060102_150405")))
	f, err := os.Create(logFile)
	if err != nil {
		log.Printf("Failed to create log file: %v", err)
		return &TaskLogger{}
	}

	return &TaskLogger{file: f}
}

func (l *TaskLogger) Log(phase, format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	timestamp := time.Now().Format("15:04:05")
	logLine := fmt.Sprintf("[%s] [%s] %s", timestamp, phase, msg)

	// Always log to stdout
	log.Println(logLine)

	// Also write to file if available
	if l.file != nil {
		fmt.Fprintln(l.file, logLine)
	}
}

func (l *TaskLogger) LogContent(label, content string) {
	if l.file == nil {
		return
	}
	fmt.Fprintf(l.file, "\n=== %s ===\n%s\n=== END %s ===\n\n", label, content, label)
}

func (l *TaskLogger) Close() {
	if l.file != nil {
		l.file.Close()
	}
}
