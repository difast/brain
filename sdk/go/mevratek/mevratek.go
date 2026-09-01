// Package mevratek is the official Go SDK for the Mevratek device-control API.
//
// Register a device once, then report liveness and telemetry and ask the brain
// for decisions. Only the standard library is required.
//
//	bot, err := mevratek.Register(ctx, "https://your-api/api/v1", mevratek.RegisterRequest{
//		Name:      "rover-01",
//		RobotType: "rover",
//		Capabilities: []mevratek.Capability{
//			{Type: "move_forward", Value: map[string]any{"type": "number", "min": 0, "max": 1}},
//			{Type: "stop"},
//		},
//	})
package mevratek

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// DefaultTimeout bounds a single request when the client builds its own HTTP client.
const DefaultTimeout = 30 * time.Second

// Capability is one low-level command the device knows how to execute.
type Capability struct {
	Type  string         `json:"type"`
	Value map[string]any `json:"value,omitempty"`
}

// Robot is a device as the platform knows it.
type Robot struct {
	ID           string       `json:"id"`
	Name         string       `json:"name"`
	RobotType    string       `json:"robot_type"`
	Status       string       `json:"status"`
	Paused       bool         `json:"paused"`
	Capabilities []Capability `json:"capabilities"`
	CreatedAt    string       `json:"created_at"`
}

// Action is one command the brain wants executed.
type Action struct {
	ActionID  string `json:"action_id"`
	Type      string `json:"type"`
	Value     any    `json:"value"`
	Universal any    `json:"universal"`
}

// Decision is the brain's answer to a Decide call.
type Decision struct {
	Goal       string   `json:"goal"`
	Thought    *string  `json:"thought"`
	Confidence float64  `json:"confidence"`
	Actions    []Action `json:"actions"`
	Provider   *string  `json:"provider"`
	Model      *string  `json:"model"`
	LatencyMS  *int     `json:"latency_ms"`
}

// Task is one queued job for a device.
type Task struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    int    `json:"priority"`
}

// Error is returned when the API answers with a non-2xx status.
type Error struct {
	StatusCode int
	Message    string
}

func (e *Error) Error() string {
	return fmt.Sprintf("mevratek: [%d] %s", e.StatusCode, e.Message)
}

// Client talks to one Mevratek deployment as one device.
//
// Construct it with New when you already hold a token, or with Register to
// enroll a new device.
type Client struct {
	BaseURL string
	Token   string

	// Robot and APIKey are populated by Register.
	Robot  *Robot
	APIKey string

	http *http.Client
}

// Option customises a Client at construction.
type Option func(*Client)

// WithHTTPClient supplies your own *http.Client — for proxies, custom TLS or tests.
func WithHTTPClient(h *http.Client) Option {
	return func(c *Client) { c.http = h }
}

// WithTimeout bounds each request. Ignored when WithHTTPClient is also given.
func WithTimeout(d time.Duration) Option {
	return func(c *Client) { c.http = &http.Client{Timeout: d} }
}

// New builds a client from a token saved earlier.
func New(baseURL, token string, opts ...Option) *Client {
	c := &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Token:   token,
		http:    &http.Client{Timeout: DefaultTimeout},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// RegisterRequest describes the device being enrolled.
type RegisterRequest struct {
	// APIKey is an organization API key (cbk_...) issued from the dashboard: it
	// says which organization the new device belongs to. Registration swaps it
	// for a device token, so the key never has to live on the device.
	APIKey string `json:"-"`

	Name         string         `json:"name"`
	RobotType    string         `json:"robot_type"`
	Capabilities []Capability   `json:"capabilities"`
	Meta         map[string]any `json:"meta,omitempty"`
}

// Register enrolls a new device and returns an authenticated client.
//
// Persist the returned Client.Token: it is how the device signs in afterwards.
func Register(ctx context.Context, baseURL string, req RegisterRequest, opts ...Option) (*Client, error) {
	c := New(baseURL, req.APIKey, opts...)
	if req.Capabilities == nil {
		req.Capabilities = []Capability{}
	}
	if req.Meta == nil {
		req.Meta = map[string]any{}
	}

	var out struct {
		Token  string `json:"token"`
		APIKey string `json:"api_key"`
		Robot  Robot  `json:"robot"`
	}
	if err := c.do(ctx, http.MethodPost, "/robots/register", req, &out); err != nil {
		return nil, err
	}
	c.Token = out.Token
	c.APIKey = out.APIKey
	c.Robot = &out.Robot
	return c, nil
}

// Heartbeat reports liveness. A device with no recent heartbeat reads as offline.
func (c *Client) Heartbeat(ctx context.Context, status string) error {
	if status == "" {
		status = "online"
	}
	return c.do(ctx, http.MethodPost, "/robots/heartbeat", map[string]any{"status": status}, nil)
}

// DecideRequest asks the brain what to do next.
type DecideRequest struct {
	Task  string         `json:"task"`
	State map[string]any `json:"state"`

	// ImageB64 is a camera frame that is already base64-encoded. When ImageBytes
	// is set instead, the SDK encodes it for you.
	ImageB64       string `json:"image_b64,omitempty"`
	ImageBytes     []byte `json:"-"`
	ImageMediaType string `json:"image_media_type,omitempty"`

	FrameURL string `json:"frame_url,omitempty"`
	TaskID   string `json:"task_id,omitempty"`
}

// Decide requests the next decision for this device.
func (c *Client) Decide(ctx context.Context, req DecideRequest) (*Decision, error) {
	if req.State == nil {
		req.State = map[string]any{}
	}
	if len(req.ImageBytes) > 0 && req.ImageB64 == "" {
		req.ImageB64 = base64.StdEncoding.EncodeToString(req.ImageBytes)
	}
	if req.ImageB64 != "" && req.ImageMediaType == "" {
		req.ImageMediaType = "image/jpeg"
	}

	var out Decision
	if err := c.do(ctx, http.MethodPost, "/brain/decision", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// Telemetry is one reading from the device. Nil fields are reported as null.
type Telemetry struct {
	Battery *float64       `json:"battery"`
	Speed   *float64       `json:"speed"`
	X       *float64       `json:"x"`
	Y       *float64       `json:"y"`
	Z       *float64       `json:"z"`
	Errors  []any          `json:"errors"`
	Extra   map[string]any `json:"extra"`
}

// SendTelemetry records one reading.
func (c *Client) SendTelemetry(ctx context.Context, t Telemetry) error {
	if t.Errors == nil {
		t.Errors = []any{}
	}
	if t.Extra == nil {
		t.Extra = map[string]any{}
	}
	return c.do(ctx, http.MethodPost, "/telemetry", t, nil)
}

// Float is a helper for the optional Telemetry fields: mevratek.Float(82).
func Float(v float64) *float64 { return &v }

// NextTask pulls the next queued task, returning (nil, nil) when the queue is empty.
func (c *Client) NextTask(ctx context.Context) (*Task, error) {
	resp, err := c.send(ctx, http.MethodGet, "/tasks/next", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNoContent {
		io.Copy(io.Discard, resp.Body) //nolint:errcheck // draining for connection reuse
		return nil, nil
	}
	var task Task
	if err := decode(resp, &task); err != nil {
		return nil, err
	}
	return &task, nil
}

// ReportTaskResult closes out a task. Pass an empty status to mean "completed".
func (c *Client) ReportTaskResult(ctx context.Context, taskID, status, result string) error {
	if status == "" {
		status = "completed"
	}
	body := map[string]any{"status": status, "result": nil}
	if result != "" {
		body["result"] = result
	}
	return c.do(ctx, http.MethodPost, "/tasks/"+taskID+"/result", body, nil)
}

// Profile returns the device's capabilities and the universal actions the brain
// may use for it. Pass an empty robotID to use the device this client registered.
func (c *Client) Profile(ctx context.Context, robotID string) (map[string]any, error) {
	if robotID == "" {
		if c.Robot == nil {
			return nil, fmt.Errorf("mevratek: no robot id: pass one, or use Register")
		}
		robotID = c.Robot.ID
	}
	out := map[string]any{}
	if err := c.do(ctx, http.MethodGet, "/robots/"+robotID+"/profile", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// Execution reports how executing one action actually went (DAL feedback).
type Execution struct {
	ActionID   string  `json:"action_id"`
	Status     string  `json:"status"`
	DurationMS *int    `json:"duration_ms"`
	Error      *string `json:"error"`
	DecisionID *string `json:"decision_id"`
	ActionType *string `json:"action_type"`
}

// ReportExecution records the outcome of one command on the device.
func (c *Client) ReportExecution(ctx context.Context, e Execution) error {
	if e.Status == "" {
		e.Status = "success"
	}
	return c.do(ctx, http.MethodPost, "/executions", e, nil)
}

// -- internals --------------------------------------------------------------

func (c *Client) send(ctx context.Context, method, path string, body any) (*http.Response, error) {
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("mevratek: encoding request: %w", err)
		}
		reader = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, reader)
	if err != nil {
		return nil, fmt.Errorf("mevratek: building request: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("mevratek: %s %s: %w", method, path, err)
	}
	return resp, nil
}

func (c *Client) do(ctx context.Context, method, path string, body, out any) error {
	resp, err := c.send(ctx, method, path, body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return decode(resp, out)
}

// decode turns a response into out, or into an *Error for a non-2xx status.
func decode(resp *http.Response, out any) error {
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("mevratek: reading response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		message := string(raw)
		var payload struct {
			Message string `json:"message"`
		}
		if json.Unmarshal(raw, &payload) == nil && payload.Message != "" {
			message = payload.Message
		}
		return &Error{StatusCode: resp.StatusCode, Message: message}
	}

	if out == nil || len(bytes.TrimSpace(raw)) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("mevratek: decoding response: %w", err)
	}
	return nil
}
