package models

import (
	"encoding/json"
	"time"
)

// AuditLog represents the standard telemetry envelope
type AuditLog struct {
	ID         string          `json:"id"`
	TraceID    string          `json:"trace_id"`
	Source     string          `json:"source"`
	EventType  string          `json:"event_type"`
	ActorID    *string         `json:"actor_id"`
	CreatedAt  time.Time       `json:"created_at"`
	ReceivedAt time.Time       `json:"received_at"`
	Payload    json.RawMessage `json:"payload"`
}
