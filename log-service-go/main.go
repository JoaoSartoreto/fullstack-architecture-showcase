// main.go
package main

import (
	"log"

	"log-service/internal/broker"
	"log-service/internal/config"
	"log-service/internal/consumer"
	"log-service/internal/database"
	"log-service/internal/repository"
	"log-service/internal/service"
)

func main() {
	// 1. Configs
	cfg := config.Load()

	// 2. Infrastructure: Database
	db, err := database.Connect(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPass, cfg.DBName)
	if err != nil {
		log.Fatalf("Critical: DB connection failed: %v", err)
	}
	defer db.Close()

	if err := repository.InitSchema(db); err != nil {
		log.Fatalf("Critical: Schema migration failed: %v", err)
	}

	// 3. Infrastructure: RabbitMQ
	rmqConn, rmqCh, err := broker.Connect(cfg.RMQHost, cfg.RMQPort, cfg.RMQUser, cfg.RMQPass)
	if err != nil {
		log.Fatalf("Critical: RMQ connection failed: %v", err)
	}
	defer rmqConn.Close()
	defer rmqCh.Close()

	// 4. Dependency Injection (Wiring the layers)
	repo := repository.NewLogRepository(db)
	svc := service.NewLogService(repo)
	listener := consumer.NewRabbitMQListener(rmqCh)

	// 5. Start the engine
	// We pass the svc.ProcessRawMessage function directly as the MessageHandler contract
	if err := listener.Listen("audit_logs_queue", svc.ProcessRawMessage); err != nil {
		log.Fatalf("Critical: Listener failed to start: %v", err)
	}

	// 6. Keep main thread alive
	log.Println("🚀 Microservice operational. Awaiting telemetry events...")
	<-make(chan struct{})
}
