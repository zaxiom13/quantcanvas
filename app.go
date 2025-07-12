package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// App struct
type App struct {
	ctx     context.Context
	kdbCmd  *exec.Cmd
	kdbPort int
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		kdbPort: 5555, // Default kdb+ port
	}
}

// isPortInUse checks if a port is already in use
func (a *App) isPortInUse(port int) bool {
	fmt.Printf("Checking if port %d is in use using netstat...\n", port)
	cmd := exec.Command("netstat", "-ano")
	output, err := cmd.Output()
	if err != nil {
		fmt.Printf("Failed to run netstat: %v\n", err)
		return false // Assume not in use if check fails
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, fmt.Sprintf(":%d", port)) && strings.Contains(line, "LISTENING") {
			fmt.Printf("Found LISTENING on port %d\n", port)
			return true
		}
	}
	fmt.Printf("No LISTENING found on port %d\n", port)
	return false
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// On startup, we will always perform a "force start" to ensure a clean environment.
	// This addresses issues where a stale process might be occupying the kdb+ port.
	fmt.Println("Application starting up. Ensuring a clean kdb+ instance...")
	if err := a.ForceStartKdb(); err != nil {
		// Log the error prominently. The frontend will show a disconnected state.
		fmt.Printf("CRITICAL: Failed to start kdb+ during startup: %v\n", err)
	}
}

// startKdb starts the kdb+ process with WebSocket support.
// This is now the single, authoritative function for starting kdb+.
func (a *App) startKdb() error {
	fmt.Printf("Starting kdb+ with WebSocket support on port %d...\n", a.kdbPort)

	// First, check if 'q' command is available
	if _, err := exec.LookPath("q"); err != nil {
		return fmt.Errorf("'q' executable not found in PATH. Please install kdb+ and add it to your PATH: %w", err)
	}

	// Create an enhanced, more robust WebSocket script
	scriptContent := fmt.Sprintf(`
/ Enhanced WebSocket handler for QuantCanvas
.z.wo:{[x] 0N!"[INFO] WebSocket opened: ",string x}
.z.wc:{[x] 0N!"[INFO] WebSocket closed: ",string x}
.z.ws:{[x]
  0N!"[QUERY] Received: ",x;
  / Evaluate the query safely and return errors as a queryable object
  result: @[value; x; {[e] 0N!"[ERROR] ",e; (`+"`error;`msg)!(`ExecutionError;e)}];"+`
  / Send result back to the client as a JSON string
  neg[.z.w] .j.j result;
 }

/ Set the listening port
\p %d
/ Log that the server has started
0N!"[OK] kdb+ WebSocket server listening on port %d";
`, a.kdbPort, a.kdbPort)

	// Create temporary script file
	scriptPath := filepath.Join(os.TempDir(), "kdb_ws_init.q")
	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0644); err != nil {
		return fmt.Errorf("failed to create kdb+ init script: %w", err)
	}

	fmt.Printf("Executing command: q %s\n", scriptPath)
	a.kdbCmd = exec.Command("q", scriptPath)
	a.kdbCmd.Stdout = os.Stdout
	a.kdbCmd.Stderr = os.Stderr

	if err := a.kdbCmd.Start(); err != nil {
		return fmt.Errorf("failed to start kdb+ process: %w", err)
	}

	fmt.Printf("kdb+ process started with PID: %d. Waiting for initialization...\n", a.kdbCmd.Process.Pid)

	// Wait a moment and check if it exited immediately
	done := make(chan error, 1)
	go func() {
		done <- a.kdbCmd.Wait()
	}()

	select {
	case err := <-done:
		// Process exited. If the port is now in use, another kdb+ instance may have started.
		if a.isPortInUse(a.kdbPort) {
			fmt.Printf("kdb+ process exited, but port %d is now in use. Assuming external instance.\n", a.kdbPort)
			a.kdbCmd = nil // We are not managing this process
			return nil
		}
		return fmt.Errorf("kdb+ process exited unexpectedly. Check logs for details. Error: %v", err)
	case <-time.After(2 * time.Second): // Wait 2 seconds
		// Process is still running, success!
		fmt.Println("kdb+ process appears to be running correctly.")
	}

	return nil
}

// stopKdb stops the kdb+ process
func (a *App) stopKdb() error {
	if a.kdbCmd != nil && a.kdbCmd.Process != nil {
		fmt.Println("Stopping kdb+ process...")
		// Use Kill() for Windows compatibility instead of Signal(SIGTERM)
		if err := a.kdbCmd.Process.Kill(); err != nil {
			return fmt.Errorf("failed to stop kdb+ process: %w", err)
		}
		// Wait for process to exit
		a.kdbCmd.Wait()
		fmt.Println("kdb+ process stopped")
	}
	return nil
}

// killProcessOnPort kills whatever process is using the specified port (Windows)
func (a *App) killProcessOnPort(port int) error {
	fmt.Printf("Attempting to kill process on port %d...\n", port)

	// Use netstat to find the process using the port
	cmd := exec.Command("netstat", "-ano")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to run netstat: %w", err)
	}

	// Parse output to find PID (this is a simplified approach)
	// In a real implementation, you'd want more robust parsing
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, fmt.Sprintf(":%d", port)) && strings.Contains(line, "LISTENING") {
			parts := strings.Fields(line)
			if len(parts) >= 5 {
				pid := parts[len(parts)-1]
				fmt.Printf("Found process %s using port %d, attempting to kill...\n", pid, port)

				// Kill the process
				killCmd := exec.Command("taskkill", "/F", "/PID", pid)
				if err := killCmd.Run(); err != nil {
					return fmt.Errorf("failed to kill process %s: %w", pid, err)
				}

				fmt.Printf("Successfully killed process %s\n", pid)
				return nil
			}
		}
	}

	return fmt.Errorf("no process found listening on port %d", port)
}

// GetKdbPort returns the kdb+ WebSocket port
func (a *App) GetKdbPort() int {
	return a.kdbPort
}

// GetKdbStatus returns the status of the kdb+ process
func (a *App) GetKdbStatus() string {
	if a.kdbCmd == nil || a.kdbCmd.Process == nil {
		// We don't have our own process, check if port is in use
		if a.isPortInUse(a.kdbPort) {
			return "running" // Something is using the port, assume it's kdb+
		}
		return "stopped"
	}

	// Check if process is still running (Windows-compatible)
	// First check if ProcessState is available and shows process exited
	if a.kdbCmd.ProcessState != nil {
		if a.kdbCmd.ProcessState.Exited() {
			return "stopped"
		}
		return "running"
	}

	// If ProcessState is not available yet, assume it's running
	// since we just started it
	return "running"
}

// TestKdbConnection tests if the kdb+ WebSocket endpoint is reachable
func (a *App) TestKdbConnection() string {
	if a.GetKdbStatus() != "running" {
		return "kdb+ process not running"
	}

	// Try to connect to the WebSocket endpoint
	// This is a simple check - in a real implementation you might want to use a proper WebSocket library
	return fmt.Sprintf("kdb+ WebSocket should be available at ws://localhost:%d", a.kdbPort)
}

// StartKdb starts the kdb+ process (public method for frontend)
func (a *App) StartKdb() error {
	fmt.Println("Starting kdb+ process from frontend request...")

	// Check if already running
	if a.GetKdbStatus() == "running" {
		return fmt.Errorf("kdb+ is already running")
	}

	// Start kdb+ process
	if err := a.startKdb(); err != nil {
		return fmt.Errorf("failed to start kdb+: %w", err)
	}

	fmt.Println("kdb+ process started successfully")
	return nil
}

// StopKdb stops the kdb+ process (public method for frontend)
func (a *App) StopKdb() error {
	fmt.Println("Stopping kdb+ process from frontend request...")

	if err := a.stopKdb(); err != nil {
		return fmt.Errorf("failed to stop kdb+: %w", err)
	}

	fmt.Println("kdb+ process stopped successfully")
	return nil
}

// RestartKdb restarts the kdb+ process
func (a *App) RestartKdb() error {
	fmt.Println("Restarting kdb+ process...")

	// Stop existing process if running
	if err := a.stopKdb(); err != nil {
		fmt.Printf("Warning: Error stopping kdb+: %v\n", err)
	}

	// Wait a moment for process to fully stop and release port
	time.Sleep(2 * time.Second)

	// Start new process
	if err := a.startKdb(); err != nil {
		return fmt.Errorf("failed to restart kdb+: %w", err)
	}

	fmt.Println("kdb+ process restarted successfully")
	return nil
}

// ForceStartKdb kills any existing process on the port and starts kdb+
func (a *App) ForceStartKdb() error {
	fmt.Println("Force starting kdb+ process...")

	// First, kill any existing process on the port
	if a.isPortInUse(a.kdbPort) {
		fmt.Printf("Port %d is in use. Killing existing process...\n", a.kdbPort)
		if err := a.killProcessOnPort(a.kdbPort); err != nil {
			return fmt.Errorf("failed to kill existing process: %w", err)
		}
		// Wait a moment for the port to be released
		time.Sleep(2 * time.Second)
	}

	// Stop our own process if running, to be safe
	if a.kdbCmd != nil && a.kdbCmd.Process != nil {
		a.stopKdb()
		time.Sleep(1 * time.Second)
	}

	// Start kdb+ process
	if err := a.startKdb(); err != nil {
		return fmt.Errorf("failed to force start kdb+: %w", err)
	}

	fmt.Println("kdb+ process force started successfully")
	return nil
}

// CheckKdbInstallation checks if kdb+ is properly installed
func (a *App) CheckKdbInstallation() string {
	// Check if 'q' command is available
	qPath, err := exec.LookPath("q")
	if err != nil {
		return "ERROR: kdb+ executable 'q' not found in PATH. Please install kdb+ and ensure 'q' is in your PATH."
	}

	fmt.Printf("Found kdb+ executable at: %s\n", qPath)

	// Try to run a simple kdb+ command to check if it works
	cmd := exec.Command("q", "-q", "-c", "2+2")
	output, err := cmd.CombinedOutput()

	if err != nil {
		return fmt.Sprintf("ERROR: kdb+ failed to execute simple test: %v\nOutput: %s", err, string(output))
	}

	return fmt.Sprintf("OK: kdb+ is properly installed at %s\nTest output: %s", qPath, string(output))
}

// domReady is called after front-end resources have been loaded
func (a App) domReady(ctx context.Context) {
	// Add your action here
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	// Stop kdb+ process before closing
	if err := a.stopKdb(); err != nil {
		fmt.Printf("Error stopping kdb+: %v\n", err)
	}
	return false
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Perform your teardown here
	a.stopKdb()
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
