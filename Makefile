.PHONY: setup install dev build start stop clean help

# Setup environment file if it doesn't exist
setup:
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
	else \
		echo ".env already exists, skipping..."; \
	fi

# Install dependencies for all packages
install: setup
	@echo "Installing dependencies..."
	pnpm install

# Run development servers
dev: setup
	@echo "Starting development servers..."
	pnpm run dev

# Build all packages
build: setup
	@echo "Building all packages..."
	pnpm run build

# Start production servers
start: setup build
	@echo "Starting production servers..."
	pnpm run start

# Clean build artifacts and dependencies
clean:
	@echo "Cleaning build artifacts and dependencies..."
	rm -rf node_modules
	rm -rf client/node_modules client/.next client/dist
	rm -rf server/node_modules server/dist
	rm -rf .pnpm-store

# Stop all running processes (for development)
stop:
	@echo "Stopping all node processes..."
	-pkill -f "node.*red-tetris" || true
	-pkill -f "ts-node" || true

# Show help
help:
	@echo "Available commands:"
	@echo "  make setup    - Create .env from .env.example if it doesn't exist"
	@echo "  make install  - Install all dependencies"
	@echo "  make dev      - Run development servers"
	@echo "  make build    - Build all packages"
	@echo "  make start    - Build and start production servers"
	@echo "  make clean    - Remove all build artifacts and dependencies"
	@echo "  make stop     - Stop all running node processes"
	@echo "  make help     - Show this help message"
