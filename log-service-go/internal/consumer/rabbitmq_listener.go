package consumer

import (
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// MessageHandler is a contract function that defines what to do with the payload
type MessageHandler func(payload []byte) error

type RabbitMQListener struct {
	ch *amqp.Channel
}

func NewRabbitMQListener(ch *amqp.Channel) *RabbitMQListener {
	return &RabbitMQListener{ch: ch}
}

// Listen sets up the queue and routes raw messages to the provided handler
func (l *RabbitMQListener) Listen(queueName string, handler MessageHandler) error {
	q, err := l.ch.QueueDeclare(queueName, true, false, false, false, nil)
	if err != nil {
		return err
	}

	msgs, err := l.ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		return err
	}

	go func() {
		for d := range msgs {
			// Delegate the business logic to the handler
			err := handler(d.Body)

			if err != nil {
				log.Printf("❌ Message processing failed: %v", err)
				d.Nack(false, true) // Requeue on error
			} else {
				d.Ack(false) // Confirm success
			}
		}
	}()

	log.Printf("🎧 Listening for events on RabbitMQ queue: %s", queueName)
	return nil
}
