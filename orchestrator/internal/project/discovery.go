package project

import (
	"fmt"
	"os"
	"path/filepath"
)

// Paths holds the resolved paths of project sub-directories.
type Paths struct {
	Root         string
	Backend      string
	Mobile       string
	Orchestrator string
	Deploy       string
	TaskFile     string
}

// Discover finds the project root and resolves sub-project paths.
func Discover(root string) (*Paths, error) {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("resolve absolute path: %w", err)
	}

	paths := &Paths{
		Root:         absRoot,
		Backend:      filepath.Join(absRoot, "backend"),
		Mobile:       filepath.Join(absRoot, "mobile"),
		Orchestrator: filepath.Join(absRoot, "orchestrator"),
		Deploy:       filepath.Join(absRoot, "deploy"),
		TaskFile:     filepath.Join(absRoot, "task_list.json"),
	}

	// Validate that at least the root exists
	if _, err := os.Stat(absRoot); os.IsNotExist(err) {
		return nil, fmt.Errorf("project root does not exist: %s", absRoot)
	}

	return paths, nil
}

// HasBackend checks if the backend sub-project exists.
func (p *Paths) HasBackend() bool {
	return fileExists(filepath.Join(p.Backend, "go.mod"))
}

// HasMobile checks if the mobile sub-project exists.
func (p *Paths) HasMobile() bool {
	return fileExists(filepath.Join(p.Mobile, "package.json"))
}

// HasTaskFile checks if the task list file exists.
func (p *Paths) HasTaskFile() bool {
	return fileExists(p.TaskFile)
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
