# ==========================================
# STAGE 1: Builder
# ==========================================
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy dependency manifests first to leverage Docker cache
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire source code
COPY . .

# Build a statically linked binary (disabling CGO ensures it runs anywhere)
RUN CGO_ENABLED=0 GOOS=linux go build -o api-server .

# ==========================================
# STAGE 2: Minimal Runtime
# ==========================================
# We use the latest pristine alpine image to avoid vulnerabilities from the Go compiler image
FROM alpine:latest

WORKDIR /app

# Copy only the compiled binary from the builder stage
COPY --from=builder /app/api-server .

EXPOSE 8080

# Execute the binary
CMD ["./api-server"]