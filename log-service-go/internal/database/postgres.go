package database

import (
	"database/sql"
	"fmt"
	"time"

	// Anonymous import to initialize the Postgres driver
	_ "github.com/lib/pq"
)

// Connect establishes a high-performance database connection pool
func Connect(host, port, user, password, dbname string) (*sql.DB, error) {
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname,
	)

	// Open does not establish an active network connection, it just initializes the pool management structures
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection pool: %w", err)
	}

	// Configure database pool limits for production readiness
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Ping forces an active TCP connection to verify database viability
	if err := db.Ping(); err != nil {
		db.Close() // Safely clean up unviable pool state
		return nil, fmt.Errorf("database infrastructure unreachable: %w", err)
	}

	return db, nil
}
