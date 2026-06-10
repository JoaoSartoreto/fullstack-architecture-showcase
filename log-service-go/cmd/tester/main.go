package main

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

func main() {
	// 1. Connect to RabbitMQ (The TCP Socket)
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	if err != nil {
		log.Fatalf("Critical: Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	// 2. Open an AMQP Channel (The Multiplexed Lane)
	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Critical: Failed to open AMQP channel: %v", err)
	}
	defer ch.Close()

	// 3. Craft the mock payload adhering strictly to the Integration Contract
	traceID, _ := uuid.NewV7()
	timestamp := time.Now().UTC().Format(time.RFC3339)

	jsonPayload := `
	{
		"trace_id": "` + traceID.String() + `",
		"source": "TEST_SCRIPT",
		"event_type": "DATA_MUTATION",
		"created_at": "` + timestamp + `",
		"payload": {
			"entity": "orders",
			"entity_id": "uuid-9999",
			"operation": "INSERT",
			"changes": {
				"after": { "status": "DRAFT", "total": 150.50 }
			}
		}
	}`

	// 4. Publish the message to the target queue
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = ch.PublishWithContext(ctx,
		"",                 // Default exchange
		"audit_logs_queue", // Routing key (must match the queue name)
		false,              // Mandatory
		false,              // Immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        []byte(jsonPayload),
		})

	if err != nil {
		log.Fatalf("Critical: Failed to publish message to queue: %v", err)
	}

	log.Printf("✅ Test message successfully injected into queue! Trace ID: %s", traceID.String())
}
