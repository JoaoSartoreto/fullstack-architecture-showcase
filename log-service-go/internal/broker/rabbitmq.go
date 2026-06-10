package broker

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Connect establishes a TCP connection and opens an AMQP channel
func Connect(host, port, user, password string) (*amqp.Connection, *amqp.Channel, error) {
	url := fmt.Sprintf("amqp://%s:%s@%s:%s/", user, password, host, port)

	// Dial creates the heavy TCP connection to the broker
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	// Channel creates a lightweight multiplexed stream inside the TCP connection
	ch, err := conn.Channel()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open AMQP channel: %w", err)
	}

	return conn, ch, nil
}
