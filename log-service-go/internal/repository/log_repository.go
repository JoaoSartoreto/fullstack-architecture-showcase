package repository

import (
	"database/sql"
	"fmt"
	"log-service/internal/models"

	"github.com/google/uuid"
)

type LogRepository struct {
	db *sql.DB
}

func NewLogRepository(db *sql.DB) *LogRepository {
	return &LogRepository{db: db}
}

// Insert persists the log envelope and returns the DB-generated ID and ingestion timestamp
func (r *LogRepository) Insert(log *models.AuditLog) error {
	// Generate the time-ordered UUIDv7 directly in Go
	id, err := uuid.NewV7()
	if err != nil {
		return fmt.Errorf("failed to generate UUIDv7: %w", err)
	}

	log.ID = id.String()

	query := `
		INSERT INTO audit_logs (id, trace_id, source, event_type, actor_id, created_at, payload)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING received_at
	`

	err = r.db.QueryRow(
		query,
		log.ID,
		log.TraceID,
		log.Source,
		log.EventType,
		log.ActorID,
		log.CreatedAt,
		log.Payload,
	).Scan(&log.ReceivedAt)

	if err != nil {
		return fmt.Errorf("error inserting audit log: %w", err)
	}

	return nil
}
