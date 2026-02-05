package task

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

type Task struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Status       string   `json:"status"` // pending, in_progress, completed, failed
	Priority     int      `json:"priority"`
	DependsOn    []string `json:"depends_on"`
	TestCommand  string   `json:"test_command,omitempty"`  // Per-task test command (overrides global)
	AutoCommit   bool     `json:"auto_commit,omitempty"`   // Auto git commit on success
	IsDeployment bool     `json:"is_deployment,omitempty"` // True if this is a deployment task
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
	Error        string   `json:"error,omitempty"`
	Attempts     int      `json:"attempts,omitempty"` // Number of execution attempts
	Duration     string   `json:"duration,omitempty"` // Total execution duration
}

type TaskList struct {
	Tasks []Task `json:"tasks"`
}

type Manager struct {
	filePath string
}

func NewManager(filePath string) *Manager {
	return &Manager{filePath: filePath}
}

func (m *Manager) Load() (*TaskList, error) {
	data, err := os.ReadFile(m.filePath)
	if err != nil {
		return nil, fmt.Errorf("read task file: %w", err)
	}

	var list TaskList
	if err := json.Unmarshal(data, &list); err != nil {
		return nil, fmt.Errorf("parse task file: %w", err)
	}

	return &list, nil
}

func (m *Manager) Save(list *TaskList) error {
	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal task list: %w", err)
	}

	return os.WriteFile(m.filePath, data, 0644)
}

// NextPendingTask returns the highest-priority pending task whose dependencies are all completed.
func (m *Manager) NextPendingTask() (*Task, error) {
	list, err := m.Load()
	if err != nil {
		return nil, err
	}

	completedIDs := make(map[string]bool)
	for _, t := range list.Tasks {
		if t.Status == "completed" {
			completedIDs[t.ID] = true
		}
	}

	var best *Task
	for i, t := range list.Tasks {
		if t.Status != "pending" {
			continue
		}

		// Check all dependencies are completed
		allDepsCompleted := true
		for _, dep := range t.DependsOn {
			if !completedIDs[dep] {
				allDepsCompleted = false
				break
			}
		}

		if !allDepsCompleted {
			continue
		}

		if best == nil || t.Priority > best.Priority {
			best = &list.Tasks[i]
		}
	}

	if best == nil {
		return nil, fmt.Errorf("no pending tasks available")
	}

	return best, nil
}

func (m *Manager) UpdateStatus(id, status string) error {
	list, err := m.Load()
	if err != nil {
		return err
	}

	for i, t := range list.Tasks {
		if t.ID == id {
			list.Tasks[i].Status = status
			list.Tasks[i].UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return m.Save(list)
		}
	}

	return fmt.Errorf("task %s not found", id)
}

func (m *Manager) SetError(id, errMsg string) error {
	list, err := m.Load()
	if err != nil {
		return err
	}

	for i, t := range list.Tasks {
		if t.ID == id {
			list.Tasks[i].Status = "failed"
			list.Tasks[i].Error = errMsg
			list.Tasks[i].UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return m.Save(list)
		}
	}

	return fmt.Errorf("task %s not found", id)
}

func (m *Manager) AddTask(t Task) error {
	list, err := m.Load()
	if err != nil {
		// If file doesn't exist, create a new list
		list = &TaskList{}
	}

	t.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	t.UpdatedAt = t.CreatedAt
	if t.Status == "" {
		t.Status = "pending"
	}

	list.Tasks = append(list.Tasks, t)
	return m.Save(list)
}
