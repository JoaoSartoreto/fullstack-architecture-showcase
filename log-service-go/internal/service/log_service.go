package service

import (
	"encoding/json"
	"fmt"
	"log"

	"log-service/internal/models"
)

// AuditRepository defines the contract for persisting logs.
// This allows us to inject either a real PostgreSQL repo or a Mock for testing.
type AuditRepository interface {
	Insert(log *models.AuditLog) error
}

// LogService handles the business logic for processing telemetry data
type LogService struct {
	repo AuditRepository
}

func NewLogService(repo AuditRepository) *LogService {
	return &LogService{repo: repo}
}

// ProcessRawMessage is the exact implementation of the consumer.MessageHandler contract.
// It parses the raw AMQP bytes, validates the JSON structure, and persists it.
func (s *LogService) ProcessRawMessage(payload []byte) error {
	var auditLog models.AuditLog

	// 1. Parse the JSON Envelope
	if err := json.Unmarshal(payload, &auditLog); err != nil {
		log.Printf("⚠️ Warning: Malformed JSON envelope dropped: %v", err)
		// We return nil so the consumer Ack's and discards the garbage message.
		return nil
	}

	// 2. Persist to Database
	if err := s.repo.Insert(&auditLog); err != nil {
		return fmt.Errorf("failed to persist log trace %s: %w", auditLog.TraceID, err)
	}

	return nil
}
