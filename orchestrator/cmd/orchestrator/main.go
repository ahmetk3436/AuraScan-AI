package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/orchestrator/internal/agents"
	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/orchestrator/internal/config"
	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/orchestrator/internal/loop"
	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/orchestrator/internal/project"
	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/orchestrator/internal/task"
)

func main() {
	mode := flag.String("mode", "continuous", "Run mode: 'continuous' (process all tasks) or 'single' (process one task)")
	taskID := flag.String("task", "", "Task ID to run (single mode only)")
	flag.Parse()

	cfg := config.Load()

	log.Println("Autonomous App Factory Orchestrator")
	log.Println("====================================")

	// Discover project structure
	paths, err := project.Discover(cfg.ProjectRoot)
	if err != nil {
		log.Fatalf("Project discovery failed: %v", err)
	}

	log.Printf("Project root: %s", paths.Root)
	log.Printf("Backend found: %v", paths.HasBackend())
	log.Printf("Mobile found: %v", paths.HasMobile())
	log.Printf("Task file found: %v", paths.HasTaskFile())

	if cfg.EngineAPIKey == "" {
		log.Fatal("ENGINE_API_KEY is required")
	}

	// Initialize agents
	engine := agents.NewEngine(agents.EngineConfig{
		APIKey:  cfg.EngineAPIKey,
		APIURL:  cfg.EngineAPIURL,
		Model:   cfg.EngineModel,
		Timeout: cfg.EngineTimeout,
	})
	executioner := agents.NewExecutioner(agents.ExecutionerConfig{
		Mode:    cfg.ExecutionerMode,
		WorkDir: paths.Root,
		Timeout: cfg.ExecutionerTimeout,
		APIKey:  cfg.ExecutionerAPIKey,
		APIURL:  cfg.ExecutionerAPIURL,
		Model:   cfg.ExecutionerModel,
	})
	debugger := agents.NewDebugger(agents.DebuggerConfig{
		APIKey:  cfg.DebuggerAPIKey,
		APIURL:  cfg.DebuggerAPIURL,
		Model:   cfg.DebuggerModel,
		Timeout: cfg.DebuggerTimeout,
	})

	log.Printf("Engine timeout: %v", cfg.EngineTimeout)
	log.Printf("Executioner mode: %s", cfg.ExecutionerMode)
	if cfg.ExecutionerMode == "api" {
		log.Printf("Executioner model: %s", cfg.ExecutionerModel)
	}

	agentSet := &loop.AgentSet{
		Engine:      engine,
		Executioner: executioner,
		Debugger:    debugger,
	}

	loopCfg := &loop.LoopConfig{
		MaxRetries:         cfg.MaxRetries,
		DefaultTestCommand: cfg.TestCommandGo,
		ProjectDir:         paths.Root,
		LogDir:             cfg.LogDir,
		AutoCommit:         cfg.AutoCommit,
		FallbackToCLI:      cfg.ExecutionerFallbackCLI,

		// Deploy configuration
		DeployEnabled:  cfg.CoolifyEnabled,
		GitHubPAT:      cfg.GitHubPAT,
		GitHubOwner:    cfg.GitHubOwner,
		GitHubRepoName: cfg.GitHubRepoName,
		CoolifyURL:     cfg.CoolifyURL,
		CoolifyToken:   cfg.CoolifyToken,
		CoolifyServer:  cfg.CoolifyServer,
		CoolifyProject: cfg.CoolifyProject,
		CoolifyEnv:     cfg.CoolifyEnv,
	}

	// Setup context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println("Shutting down orchestrator...")
		cancel()
	}()

	// Initialize task manager
	taskMgr := task.NewManager(paths.TaskFile)

	switch *mode {
	case "single":
		if *taskID == "" {
			log.Fatal("--task flag is required in single mode")
		}
		taskList, err := taskMgr.Load()
		if err != nil {
			log.Fatalf("Failed to load tasks: %v", err)
		}
		var target *task.Task
		for i, t := range taskList.Tasks {
			if t.ID == *taskID {
				target = &taskList.Tasks[i]
				break
			}
		}
		if target == nil {
			log.Fatalf("Task %s not found", *taskID)
		}
		if err := loop.RunAutonomousLoop(ctx, target, agentSet, loopCfg); err != nil {
			log.Fatalf("Task failed: %v", err)
		}
		if err := taskMgr.UpdateStatus(target.ID, "completed"); err != nil {
			log.Printf("Failed to update status: %v", err)
		}

	case "continuous":
		if err := loop.RunContinuous(ctx, taskMgr, agentSet, loopCfg); err != nil {
			log.Fatalf("Continuous loop error: %v", err)
		}

	default:
		log.Fatalf("Unknown mode: %s", *mode)
	}

	log.Println("Orchestrator finished.")
}
