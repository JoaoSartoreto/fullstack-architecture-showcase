package service

import (
	"errors"
	"testing"

	"log-service/internal/models"
)

// MockAuditRepository implements the AuditRepository interface for testing purposes
type MockAuditRepository struct {
	InsertFunc func(log *models.AuditLog) error
}

// Insert executes the injected mock function
func (m *MockAuditRepository) Insert(log *models.AuditLog) error {
	return m.InsertFunc(log)
}

func TestProcessRawMessage(t *testing.T) {
	// Table-Driven Tests
	scenarios := []struct {
		name          string
		inputPayload  []byte
		mockInsert    func(log *models.AuditLog) error
		expectedError bool
	}{
		{
			name:         "Should ignore malformed JSON and return nil (to allow RabbitMQ to drop it)",
			inputPayload: []byte(`{ invalid_syntax }`),
			mockInsert: func(log *models.AuditLog) error {
				t.Fatal("Repository should not be called with invalid JSON")
				return nil
			},
			expectedError: false,
		},
		{
			name:         "Should process valid payload and return success",
			inputPayload: []byte(`{"trace_id": "uuid-123", "source": "TEST", "event_type": "TEST_EVENT"}`),
			mockInsert: func(log *models.AuditLog) error {
				if log.TraceID != "uuid-123" {
					t.Errorf("Expected trace_id 'uuid-123', got '%s'", log.TraceID)
				}
				return nil
			},
			expectedError: false,
		},
		{
			name:         "Should propagate database error (to trigger RabbitMQ requeue)",
			inputPayload: []byte(`{"trace_id": "uuid-999"}`),
			mockInsert: func(log *models.AuditLog) error {
				return errors.New("simulated database failure")
			},
			expectedError: true,
		},
	}

	for _, scenario := range scenarios {
		t.Run(scenario.name, func(t *testing.T) {
			// Setup the mock and service
			mockRepo := &MockAuditRepository{InsertFunc: scenario.mockInsert}
			svc := NewLogService(mockRepo)

			// Execute business logic
			err := svc.ProcessRawMessage(scenario.inputPayload)

			// Validate expected outcome
			hasError := (err != nil)
			if hasError != scenario.expectedError {
				t.Errorf("Scenario '%s' failed. Expected error: %v, Got error: %v", scenario.name, scenario.expectedError, hasError)
			}
		})
	}
}
