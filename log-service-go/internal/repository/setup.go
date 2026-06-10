package repository

import (
	"database/sql"
	"fmt"
)

// InitSchema ensures the logging tables and strict B-Tree partial indexes exist.
func InitSchema(db *sql.DB) error {
	query := `
	CREATE TABLE IF NOT EXISTS audit_logs (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		trace_id UUID NOT NULL,
		source VARCHAR(50) NOT NULL,
		event_type VARCHAR(100) NOT NULL,
		actor_id UUID,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL,
		received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		payload JSONB NOT NULL
	);

	-- Core Routing Indexes
	CREATE INDEX IF NOT EXISTS idx_audit_logs_trace_id ON audit_logs (trace_id);
	CREATE INDEX IF NOT EXISTS idx_audit_logs_source_event ON audit_logs (source, event_type);
	
	-- Database Mutation Partial Indexes (For tracking data changes)
	CREATE INDEX IF NOT EXISTS idx_payload_entity ON audit_logs ((payload->>'entity')) WHERE (payload->>'entity') IS NOT NULL;
	CREATE INDEX IF NOT EXISTS idx_payload_entity_id ON audit_logs ((payload->>'entity_id')) WHERE (payload->>'entity_id') IS NOT NULL;

	-- HTTP Telemetry Partial Indexes (For tracking API routing and failures)
	CREATE INDEX IF NOT EXISTS idx_payload_http_path ON audit_logs ((payload->'http'->>'path')) WHERE (payload->'http'->>'path') IS NOT NULL;
	CREATE INDEX IF NOT EXISTS idx_payload_http_status ON audit_logs ((payload->'http'->>'status_code')) WHERE (payload->'http'->>'status_code') IS NOT NULL;

	-- Frontend Telemetry Partial Indexes (Tracking URLs and critical UI events, not specific components)
	CREATE INDEX IF NOT EXISTS idx_payload_ui_url ON audit_logs ((payload->'browser'->>'url')) WHERE (payload->'browser'->>'url') IS NOT NULL;
	CREATE INDEX IF NOT EXISTS idx_payload_ui_event ON audit_logs ((payload->'action'->>'event')) WHERE (payload->'action'->>'event') IS NOT NULL;
	`

	_, err := db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to execute schema migrations: %w", err)
	}

	return nil
}
