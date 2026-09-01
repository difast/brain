package mevratek_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/difast/brain/sdk/go/mevratek"
)

// seen records what the stub server received, so tests assert on the exact
// request shape the platform would get.
type seen struct {
	Method string
	Path   string
	Auth   string
	Body   map[string]any
}

// stub spins up a server that records requests and replies with handler's output.
func stub(t *testing.T, handler func(r seen) (int, any)) (*httptest.Server, *[]seen) {
	t.Helper()
	var log []seen

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		entry := seen{
			Method: r.Method,
			Path:   r.URL.Path,
			Auth:   r.Header.Get("Authorization"),
			Body:   body,
		}
		log = append(log, entry)

		status, out := handler(entry)
		if status == http.StatusNoContent {
			w.WriteHeader(status)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(out)
	}))
	t.Cleanup(srv.Close)
	return srv, &log
}

func ok(seen) (int, any) { return http.StatusOK, map[string]any{} }

func TestRegisterKeepsTheToken(t *testing.T) {
	srv, log := stub(t, func(seen) (int, any) {
		return http.StatusOK, map[string]any{
			"token":   "tok-1",
			"api_key": "key-1",
			"robot":   map[string]any{"id": "r1", "name": "rover-01"},
		}
	})

	bot, err := mevratek.Register(context.Background(), srv.URL+"/api/v1", mevratek.RegisterRequest{
		APIKey:       "cbk_test-key",
		Name:         "rover-01",
		RobotType:    "rover",
		Capabilities: []mevratek.Capability{{Type: "stop"}},
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	if bot.Token != "tok-1" || bot.APIKey != "key-1" {
		t.Fatalf("token/api key not stored: %q %q", bot.Token, bot.APIKey)
	}
	if bot.Robot == nil || bot.Robot.ID != "r1" {
		t.Fatalf("robot not stored: %+v", bot.Robot)
	}
	if got := (*log)[0].Path; got != "/api/v1/robots/register" {
		t.Fatalf("path = %q", got)
	}
	if got := (*log)[0].Body["robot_type"]; got != "rover" {
		t.Fatalf("robot_type = %v", got)
	}
	// The org key authenticates registration...
	if got := (*log)[0].Auth; got != "Bearer cbk_test-key" {
		t.Fatalf("auth = %q", got)
	}
	// ...and must not be serialised into the body.
	if _, present := (*log)[0].Body["APIKey"]; present {
		t.Fatal("the api key must not be sent in the body")
	}
	// ...and is replaced by the device token for every later call.
	if err := bot.Heartbeat(context.Background(), ""); err != nil {
		t.Fatalf("heartbeat: %v", err)
	}
	if got := (*log)[1].Auth; got != "Bearer tok-1" {
		t.Fatalf("later calls should use the device token, got %q", got)
	}
}

func TestTrailingSlashDoesNotDoubleUp(t *testing.T) {
	srv, log := stub(t, ok)
	bot := mevratek.New(srv.URL+"/api/v1/", "tok")
	if err := bot.Heartbeat(context.Background(), ""); err != nil {
		t.Fatalf("heartbeat: %v", err)
	}
	if got := (*log)[0].Path; got != "/api/v1/robots/heartbeat" {
		t.Fatalf("path = %q", got)
	}
}

func TestHeartbeatDefaultsToOnlineAndSendsTheToken(t *testing.T) {
	srv, log := stub(t, ok)
	bot := mevratek.New(srv.URL, "tok-2")
	if err := bot.Heartbeat(context.Background(), ""); err != nil {
		t.Fatalf("heartbeat: %v", err)
	}
	if got := (*log)[0].Auth; got != "Bearer tok-2" {
		t.Fatalf("auth = %q", got)
	}
	if got := (*log)[0].Body["status"]; got != "online" {
		t.Fatalf("status = %v", got)
	}
}

func TestTelemetrySendsNullsForOmittedFields(t *testing.T) {
	srv, log := stub(t, ok)
	bot := mevratek.New(srv.URL, "tok")

	err := bot.SendTelemetry(context.Background(), mevratek.Telemetry{
		Battery: mevratek.Float(82),
		Speed:   mevratek.Float(0.5),
	})
	if err != nil {
		t.Fatalf("telemetry: %v", err)
	}

	body := (*log)[0].Body
	if body["battery"] != 82.0 || body["speed"] != 0.5 {
		t.Fatalf("battery/speed = %v %v", body["battery"], body["speed"])
	}
	for _, key := range []string{"x", "y", "z"} {
		if value, present := body[key]; !present || value != nil {
			t.Fatalf("%s should be null, got %v (present=%v)", key, value, present)
		}
	}
	if _, isSlice := body["errors"].([]any); !isSlice {
		t.Fatalf("errors should be an array, got %T", body["errors"])
	}
}

func TestDecideEncodesRawImageBytes(t *testing.T) {
	srv, log := stub(t, func(seen) (int, any) {
		return http.StatusOK, map[string]any{"goal": "go", "confidence": 0.9, "actions": []any{}}
	})
	bot := mevratek.New(srv.URL, "tok")

	decision, err := bot.Decide(context.Background(), mevratek.DecideRequest{
		Task:       "approach the bottle",
		State:      map[string]any{"battery": 80},
		ImageBytes: []byte{1, 2, 3},
	})
	if err != nil {
		t.Fatalf("decide: %v", err)
	}
	if decision.Goal != "go" {
		t.Fatalf("goal = %q", decision.Goal)
	}

	want := base64.StdEncoding.EncodeToString([]byte{1, 2, 3})
	if got := (*log)[0].Body["image_b64"]; got != want {
		t.Fatalf("image_b64 = %v, want %v", got, want)
	}
	if got := (*log)[0].Body["image_media_type"]; got != "image/jpeg" {
		t.Fatalf("media type = %v", got)
	}
}

func TestDecideOmitsImageFieldsWithoutAFrame(t *testing.T) {
	srv, log := stub(t, func(seen) (int, any) {
		return http.StatusOK, map[string]any{"goal": "stop", "confidence": 1, "actions": []any{}}
	})
	bot := mevratek.New(srv.URL, "tok")

	if _, err := bot.Decide(context.Background(), mevratek.DecideRequest{Task: "stop"}); err != nil {
		t.Fatalf("decide: %v", err)
	}
	for _, key := range []string{"image_b64", "image_media_type", "frame_url", "task_id"} {
		if _, present := (*log)[0].Body[key]; present {
			t.Fatalf("%s should be omitted", key)
		}
	}
}

func TestNextTaskReturnsNilOnEmptyQueue(t *testing.T) {
	empty := true
	srv, _ := stub(t, func(seen) (int, any) {
		if empty {
			return http.StatusNoContent, nil
		}
		return http.StatusOK, map[string]any{"id": "t1", "description": "drive", "status": "queued"}
	})
	bot := mevratek.New(srv.URL, "tok")

	task, err := bot.NextTask(context.Background())
	if err != nil {
		t.Fatalf("next task: %v", err)
	}
	if task != nil {
		t.Fatalf("expected no task, got %+v", task)
	}

	empty = false
	task, err = bot.NextTask(context.Background())
	if err != nil {
		t.Fatalf("next task: %v", err)
	}
	if task == nil || task.ID != "t1" {
		t.Fatalf("task = %+v", task)
	}
}

func TestProfileFallsBackToTheRegisteredRobot(t *testing.T) {
	srv, log := stub(t, func(r seen) (int, any) {
		if r.Path == "/robots/register" {
			return http.StatusOK, map[string]any{
				"token": "t", "api_key": "k", "robot": map[string]any{"id": "rid-9"},
			}
		}
		return http.StatusOK, map[string]any{"capabilities": []any{}}
	})

	bot, err := mevratek.Register(context.Background(), srv.URL, mevratek.RegisterRequest{
		Name: "n", RobotType: "rover",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if _, err := bot.Profile(context.Background(), ""); err != nil {
		t.Fatalf("profile: %v", err)
	}
	if got := (*log)[1].Path; got != "/robots/rid-9/profile" {
		t.Fatalf("path = %q", got)
	}
}

func TestProfileWithoutAnIDFailsBeforeTheNetwork(t *testing.T) {
	srv, log := stub(t, ok)
	bot := mevratek.New(srv.URL, "tok")

	if _, err := bot.Profile(context.Background(), ""); err == nil {
		t.Fatal("expected an error")
	}
	if len(*log) != 0 {
		t.Fatalf("should not have reached the network, saw %d requests", len(*log))
	}
}

func TestAPIErrorCarriesTheStatus(t *testing.T) {
	srv, _ := stub(t, func(seen) (int, any) {
		return http.StatusUnauthorized, map[string]any{"message": "Invalid token."}
	})
	bot := mevratek.New(srv.URL, "bad")

	err := bot.Heartbeat(context.Background(), "")
	var apiErr *mevratek.Error
	if !errors.As(err, &apiErr) {
		t.Fatalf("expected *mevratek.Error, got %T (%v)", err, err)
	}
	if apiErr.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d", apiErr.StatusCode)
	}
	if apiErr.Message != "Invalid token." {
		t.Fatalf("message = %q", apiErr.Message)
	}
}

func TestReportExecutionSendsTheDALShape(t *testing.T) {
	srv, log := stub(t, ok)
	bot := mevratek.New(srv.URL, "tok")

	duration := 120
	message := "stalled"
	err := bot.ReportExecution(context.Background(), mevratek.Execution{
		ActionID:   "a1",
		Status:     "failed",
		DurationMS: &duration,
		Error:      &message,
	})
	if err != nil {
		t.Fatalf("report execution: %v", err)
	}

	body := (*log)[0].Body
	if body["action_id"] != "a1" || body["status"] != "failed" || body["duration_ms"] != 120.0 {
		t.Fatalf("body = %v", body)
	}
	if value, present := body["decision_id"]; !present || value != nil {
		t.Fatalf("decision_id should be null, got %v", value)
	}
}

func TestReportTaskResultDefaultsToCompleted(t *testing.T) {
	srv, log := stub(t, ok)
	bot := mevratek.New(srv.URL, "tok")

	if err := bot.ReportTaskResult(context.Background(), "t1", "", "done"); err != nil {
		t.Fatalf("report task result: %v", err)
	}
	if got := (*log)[0].Path; got != "/tasks/t1/result" {
		t.Fatalf("path = %q", got)
	}
	if got := (*log)[0].Body["status"]; got != "completed" {
		t.Fatalf("status = %v", got)
	}
}
