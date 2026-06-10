package config

import "os"

// Config holds the environment configuration state
type Config struct {
	DBHost string
	DBPort string
	DBUser string
	DBPass string
	DBName string

	// RabbitMQ Configs
	RMQHost string
	RMQPort string
	RMQUser string
	RMQPass string
}

// Load retrieves all environment variables with graceful local fallbacks
func Load() *Config {
	return &Config{
		DBHost: getEnv("DB_HOST", "localhost"),
		DBPort: getEnv("DB_PORT", "5433"),
		DBUser: getEnv("DB_USER", "user_log"),
		DBPass: getEnv("DB_PASS", "password_log"),
		DBName: getEnv("DB_NAME", "log_db"),

		RMQHost: getEnv("RMQ_HOST", "localhost"),
		RMQPort: getEnv("RMQ_PORT", "5672"),
		RMQUser: getEnv("RMQ_USER", "guest"),
		RMQPass: getEnv("RMQ_PASS", "guest"),
	}
}

// getEnv is now encapsulated and private to the config package (lowercase 'g')
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
