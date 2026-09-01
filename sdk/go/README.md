# Mevratek SDK (Go)

Official Go SDK for the **Mevratek for Robots** API. Standard library only — no
third-party dependencies.

## Install

```bash
go get github.com/difast/brain/sdk/go/mevratek
```

Registration needs an **organization API key** (`cbk_...`), issued from the
dashboard under *API keys*. It says which organization the new device belongs
to; registration swaps it for a device token, so the key itself never has to
live on the device.

## Quick start

```go
package main

import (
	"context"
	"log"

	"github.com/difast/brain/sdk/go/mevratek"
)

func main() {
	ctx := context.Background()

	// 1. Register once — persist bot.Token to reuse next time.
	bot, err := mevratek.Register(ctx, "https://your-api/api/v1", mevratek.RegisterRequest{
		APIKey:    "cbk_...", // organization key, from the dashboard
		Name:      "rover-01",
		RobotType: "rover",
		Capabilities: []mevratek.Capability{
			{Type: "move_forward", Value: map[string]any{"type": "number", "min": 0, "max": 1}},
			{Type: "turn_left", Value: map[string]any{"type": "number", "min": 0, "max": 180}},
			{Type: "stop"},
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Println("token:", bot.Token)

	// 2. Report liveness + telemetry.
	if err := bot.Heartbeat(ctx, ""); err != nil {
		log.Fatal(err)
	}
	err = bot.SendTelemetry(ctx, mevratek.Telemetry{
		Battery: mevratek.Float(82),
		Speed:   mevratek.Float(0),
	})
	if err != nil {
		log.Fatal(err)
	}

	// 3. Ask the brain what to do.
	decision, err := bot.Decide(ctx, mevratek.DecideRequest{
		Task:  "find and approach the bottle",
		State: map[string]any{"battery": 82, "obstacle_distance_m": 1.4},
	})
	if err != nil {
		log.Fatal(err)
	}
	for _, action := range decision.Actions {
		log.Println("execute", action.Type, action.Value)
	}
}
```

## Reusing an existing token

```go
bot := mevratek.New("https://your-api/api/v1", "eyJ...")
```

## Sending a camera frame

Pass raw bytes; the SDK base64-encodes them for you.

```go
frame, _ := os.ReadFile("frame.jpg")
decision, err := bot.Decide(ctx, mevratek.DecideRequest{
	Task:       "avoid the obstacle",
	ImageBytes: frame,
})
```

## Task Engine

```go
task, err := bot.NextTask(ctx) // (nil, nil) when the queue is empty
if err != nil {
	return err
}
if task != nil {
	// ... execute ...
	err = bot.ReportTaskResult(ctx, task.ID, "completed", "done")
}
```

## Reporting execution results

```go
duration := 340
message := "wheel stalled"
err := bot.ReportExecution(ctx, mevratek.Execution{
	ActionID:   action.ActionID,
	Status:     "failed",
	DurationMS: &duration,
	Error:      &message,
})
```

## API reference

| Function / method | Description |
|---|---|
| `mevratek.Register(ctx, url, RegisterRequest, opts...)` | Register and return a client |
| `mevratek.New(url, token, opts...)` | Construct from an existing token |
| `(*Client).Heartbeat(ctx, status)` | Report liveness (`""` means `online`) |
| `(*Client).Decide(ctx, DecideRequest)` | Get a decision |
| `(*Client).SendTelemetry(ctx, Telemetry)` | Send telemetry |
| `(*Client).NextTask(ctx)` | Pull the next queued task (or `nil`) |
| `(*Client).ReportTaskResult(ctx, taskID, status, result)` | Report task outcome |
| `(*Client).Profile(ctx, robotID)` | Capabilities + universal actions |
| `(*Client).ReportExecution(ctx, Execution)` | DAL feedback |

Options: `mevratek.WithTimeout(d)` and `mevratek.WithHTTPClient(h)`.

Failed requests return `*mevratek.Error`, which carries the status code:

```go
var apiErr *mevratek.Error
if errors.As(err, &apiErr) && apiErr.StatusCode == http.StatusUnauthorized {
	// token expired — re-register or refresh
}
```

## Development

```bash
go test ./...
```
