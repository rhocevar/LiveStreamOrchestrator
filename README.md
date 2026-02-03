# Live Streaming App

A full-stack TypeScript application for managing and streaming live video events with LiveKit. Built with modern web technologies, featuring real-time updates, scalable architecture, and production-grade reliability.

![Tech Stack](https://img.shields.io/badge/Node.js-20%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-blue)
![LiveKit](https://img.shields.io/badge/LiveKit-2.15-orange)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## Features

- 🎥 **Live Streaming**: Full WebRTC video/audio streaming powered by LiveKit
- 👥 **Participant Management**: Role-based access (HOST/VIEWER) with join/leave tracking
- 📊 **Real-time Updates**: Server-Sent Events (SSE) for live viewer counts and stream status
- 🗄️ **Persistent Storage**: PostgreSQL with Prisma ORM for type-safe database operations
- 🔄 **Queue-based Webhooks**: Redis + BullMQ for reliable webhook processing
- 🔒 **Secure Authentication**: JWT-based access tokens with configurable expiration
- 🐳 **Docker Support**: Full containerization with development and production profiles
- 🧪 **Comprehensive Testing**: Jest test suite with unit and integration tests
- 📡 **API Rate Limiting**: Protection against abuse with express-rate-limit
- 🎨 **Modern UI**: React 19 with Tailwind CSS and LiveKit components

## Architecture Summary

### System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                         Client (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Livestream   │  │   LiveKit    │  │  Real-time SSE     │    │
│  │ Management   │  │   WebRTC     │  │  Subscriptions     │    │
│  └──────┬───────┘  └───────┬──────┘  └──────────┬─────────┘    │
└─────────┼──────────────────┼────────────────────┼──────────────┘
          │                  │                    │
          │ REST API         │ WebRTC Media       │ SSE Events
          │                  │                    │
┌─────────▼──────────────────▼────────────────────▼──────────────┐
│                       Server (Express)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   Routes     │  │   Services   │  │  State Management  │    │
│  │  (HTTP/SSE)  │  │  (Business)  │  │  (Redis Pub/Sub)   │    │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘    │
│         │                 │                    │               │
│  ┌──────▼─────────────┐  ┌▼────────────────┐  ┌▼───────────┐   │
│  │ Webhook Queue      │  │ LiveKit Service │  │   Redis    │   │
│  │ (BullMQ Worker)    │  │ (SDK Client)    │  │  (State)   │   │
│  └────────────────────┘  └─────────────────┘  └────────────┘   │
└────────────────────────────────────────────────────────────────┘
          │                         │                    │
          │                         │                    │
┌─────────▼─────────────────────────▼────────────────────▼────────┐
│                    External Services                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  PostgreSQL  │  │    Redis     │  │   LiveKit Cloud    │     │
│  │  (Database)  │  │   (Queue)    │  │  (Media Server)    │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

**Livestream Creation:**
```
Client → POST /livestreams → Livestream Service → Database Service (create record)
                                                 → LiveKit Service (create room)
                                                 → Database Service (update status)
                            ← Response with livestream data
```

**Joining a Stream:**
```
Client → POST /livestreams/:id/join → Livestream Service → Verify permissions
                                                          → Generate JWT token
                                                          → Create participant record
                                     ← Access token + WebSocket URL
Client → Connect to LiveKit with token → LiveKit Cloud
```

**Real-time Updates (Webhook Flow):**
```
LiveKit → Webhook → Queue → Worker → Database Update → Redis Pub/Sub → SSE Broadcast → Clients
```

### Key Components

#### Server Architecture Layers

1. **Routes Layer** (`server/src/routes/`)
   - HTTP request/response handling
   - Input validation and sanitization
   - Response formatting with standardized JSON structure

2. **Service Layer** (`server/src/services/`)
   - **Livestream Service**: Orchestrates business logic for livestream lifecycle
   - **LiveKit Service**: Wraps LiveKit SDK for room/token management
   - **Database Service**: Prisma-based type-safe database operations
   - **State Service**: Redis-based ephemeral state tracking with SSE broadcasting
   - **Queue Service**: BullMQ job queue for webhook processing

3. **Worker Layer** (`server/src/workers/`)
   - **Webhook Worker**: Processes LiveKit webhook events from queue
   - Deduplication, retries, and transaction safety

4. **Data Layer**
   - **PostgreSQL**: Persistent storage for livestreams and participants
   - **Redis**: Ephemeral state (24h TTL) and message queue
   - **Prisma ORM**: Type-safe database queries with migrations

#### Client Architecture

- **Components**: Organized by purpose (UI primitives, livestream features)
- **Hooks**: Custom React hooks for state management (`useLivestreams`, `useSSE`)
- **Services**: Axios-based API client with TypeScript types
- **Styling**: Tailwind CSS utility-first approach

## Design Choices

### 1. **Modular Service Architecture**
   - **Why**: Separation of concerns, testability, maintainability
   - **Impact**: Each service has a single responsibility (LiveKit operations vs database operations)
   - **Benefit**: Easy to mock for testing, clear boundaries between layers

### 2. **Queue-based Webhook Processing**
   - **Why**: LiveKit expects fast webhook responses (<5s), spikes can overwhelm server
   - **Impact**: Webhooks queued in Redis, processed asynchronously by workers
   - **Benefit**: No timeout issues, handles traffic spikes, survives server restarts

### 3. **LiveKit Participant SID for Race Condition Safety**
   - **Why**: Multiple webhooks can arrive for same participant (network retries, multiple tracks)
   - **Impact**: Use LiveKit's unique session ID instead of userId for database updates
   - **Benefit**: Idempotent operations, prevents incorrect session updates

### 4. **Redis-based Stream State + SSE Broadcasting**
   - **Why**: Database queries too slow for real-time updates, polling is inefficient
   - **Impact**: Ephemeral state in Redis (24h TTL), push updates via Server-Sent Events
   - **Benefit**: Real-time UI updates, scales horizontally with Redis Pub/Sub

### 5. **TypeScript Everywhere**
   - **Why**: Type safety prevents runtime errors, better developer experience
   - **Impact**: Shared types between client/server, Prisma generates DB types
   - **Benefit**: Compile-time error detection, self-documenting code

### 6. **Deduplication Strategy**
   - **Why**: Webhooks can be delivered multiple times (network retries, failures)
   - **Impact**: Store processed webhook IDs in database with TTL
   - **Benefit**: Prevents duplicate processing, idempotent operations

### 7. **Throttled SSE Broadcasts**
   - **Why**: Participant join/leave can trigger excessive SSE traffic
   - **Impact**: Throttle viewer count updates (max 1 per 5s, 10% or 5 viewer threshold)
   - **Benefit**: Reduced bandwidth, better performance for clients

### 8. **Reconciliation Job (Safety Net)**
   - **Why**: Webhooks can be missed (server downtime, network issues, LiveKit bugs)
   - **Impact**: Background job checks database state vs LiveKit room state every 10 minutes
   - **Benefit**: Automatically cleans up stale livestreams, ensures consistency

### 9. **Soft Delete for Livestreams**
   - **Why**: Preserve historical data for analytics, auditing
   - **Impact**: Set status to `ENDED` instead of deleting record
   - **Benefit**: Can query past livestreams, maintain referential integrity

### 10. **Docker Multi-stage Builds**
   - **Why**: Development needs dev dependencies, production needs minimal size
   - **Impact**: Separate stages for dev (hot reload) and prod (optimized)
   - **Benefit**: Fast development, small production images, consistent environments

## Tech Stack

### Server (Backend)
- **Runtime**: Node.js 20+ with TypeScript 5.9
- **Framework**: Express.js 4.21
- **Database**: PostgreSQL with Prisma ORM 6.2
- **Real-time**: LiveKit Server SDK 2.14
- **Queue**: BullMQ with Redis
- **State Management**: Redis (ephemeral state, Pub/Sub)
- **Testing**: Jest with supertest

### Client (Frontend)
- **Framework**: React 19.1
- **Build Tool**: Vite 7.1
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4.1
- **HTTP Client**: Axios 1.13
- **LiveKit**: livekit-client 2.15, @livekit/components-react 2.9

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Media Server**: LiveKit Cloud (or self-hosted)

## Quick Start

### Prerequisites

**Windows & Mac:**
- [Node.js 20+](https://nodejs.org/) (Vite 7 requirement)
- [PostgreSQL 14+](https://www.postgresql.org/download/)
- [Redis 7+](https://redis.io/download) (or use Docker)
- [LiveKit Account](https://cloud.livekit.io) (free tier available)

**Optional:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for containerized setup)

### Setup Guide

#### Option 1: Docker Setup (Recommended)

**1. Navigate to the project folder:**
```bash
cd favorited
```

**2. Configure environment variables:**
```bash
# Copy the Docker environment template
cp .env.docker.example .env
```

Edit `.env` and add your LiveKit credentials:
```bash
LIVEKIT_URL=https://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

**3. Run with Docker Compose:**
```bash
# Production mode (nginx + optimized builds)
docker-compose --profile prod up

# Development mode (hot reload, debugging)
docker-compose --profile dev up
```

**4. Access the application:**
- **Client**: http://localhost (prod) or http://localhost:5173 (dev)
- **API**: http://localhost:3001/api/v1
- **Health Check**: http://localhost:3001/health

#### Option 2: Local Development Setup

**Windows-Specific Steps:**

**1. Install dependencies:**
```cmd
# Install PostgreSQL
winget install PostgreSQL.PostgreSQL

# Install Redis (via Chocolatey)
choco install redis-64

# Or use Docker for Redis
docker run -d -p 6379:6379 redis:7-alpine
```

**2. Start services:**
```cmd
# Start PostgreSQL (if installed locally)
net start postgresql-x64-14

# Start Redis (if installed locally)
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

**Mac-Specific Steps:**

**1. Install dependencies:**
```bash
# Install PostgreSQL
brew install postgresql@15

# Install Redis
brew install redis

# Start services
brew services start postgresql@15
brew services start redis
```

**2. Verify services:**
```bash
# Check PostgreSQL
psql --version

# Check Redis
redis-cli ping
# Should return: PONG
```

**Common Steps (Windows & Mac):**

**3. Clone and install:**
```bash
git clone <repository-url>
cd favorited

# Install all dependencies (client + server)
npm run install:all
```

**4. Configure server environment:**
```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```bash
# Server
NODE_ENV=development
PORT=3001

# Database (create database first)
DATABASE_URL="postgresql://user:password@localhost:5432/favorited?schema=public"

# Redis
REDIS_URL=redis://localhost:6379

# LiveKit (from cloud.livekit.io)
LIVEKIT_URL=https://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Optional settings
TOKEN_EXPIRATION_HOURS=24
WEBHOOK_QUEUE_CONCURRENCY=10
RECONCILIATION_INTERVAL_MINUTES=10
```

**5. Set up database:**
```bash
# Create database (PostgreSQL)
# Windows (cmd):
createdb -U postgres favorited

# Mac/Linux:
createdb favorited

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

**6. Start development servers:**
```bash
# From root directory - starts both client and server
cd ..
npm run dev

# Or start individually:
npm run dev:server  # Server on :3001
npm run dev:client  # Client on :5173
```

**7. Access the application:**
- **Client**: http://localhost:5173
- **API**: http://localhost:3001/api/v1
- **Health Check**: http://localhost:3001/health

### Getting LiveKit Credentials

1. Sign up at [cloud.livekit.io](https://cloud.livekit.io)
2. Create a new project
3. Copy your credentials:
   - **URL**: `wss://your-project.livekit.cloud`
   - **API Key**: Found in project settings
   - **API Secret**: Found in project settings
4. Configure webhook:
   - URL: `https://your-domain.com/api/v1/webhooks/livekit`
   - Events: Select all participant and room events
   - For local testing, you can optionally setup nkgrok to allow webhooks to reach your server

## Development Commands

### Root Directory Commands

```bash
# Install dependencies for both client and server
npm run install:all

# Start both client and server in development mode
npm run dev

# Start only server (port 3001)
npm run dev:server

# Start only client (port 5173)
npm run dev:client

# Build both client and server for production
npm run build

# Database operations
npm run prisma:generate      # Generate Prisma client types
npm run prisma:migrate       # Run database migrations
npm run prisma:studio        # Open Prisma Studio (DB GUI)
```

### Server Commands (from /server)

```bash
# Development
npm run dev                  # Start with hot reload

# Building
npm run build                # Compile TypeScript to JavaScript
npm start                    # Start production server

# Testing
npm test                     # Run all tests
npm run test:watch           # Run tests in watch mode
npm run test:coverage        # Generate coverage report
npm run test:unit            # Run unit tests only
npm run test:integration     # Run integration tests only

# Database
npm run prisma:generate      # Generate Prisma client
npm run prisma:migrate       # Create and run migrations
npm run prisma:studio        # Open database GUI
```

### Client Commands (from /client)

```bash
# Development
npm run dev                  # Start Vite dev server

# Building
npm run build                # Build for production
npm run preview              # Preview production build

# Linting
npm run lint                 # Run ESLint
```

### Docker Commands

```bash
# Production deployment
docker-compose --profile prod up -d

# Development with hot reload
docker-compose --profile dev up

# View logs
docker-compose logs -f
docker-compose logs -f server      # Server logs only

# Stop services
docker-compose down

# Stop and remove volumes (deletes data!)
docker-compose down -v

# Rebuild containers
docker-compose up -d --build

# Run database migrations in container
docker-compose exec server npx prisma migrate deploy

# Access PostgreSQL
docker-compose exec postgres psql -U favorited -d favorited

# Access Redis CLI
docker-compose exec redis redis-cli
```

## API Overview

### Base URL
- Development: `http://localhost:3001/api/v1`
- Health Check: `http://localhost:3001/health`

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/livestreams` | Create new livestream |
| `GET` | `/livestreams` | List livestreams (with filters) |
| `GET` | `/livestreams/:id` | Get livestream details |
| `DELETE` | `/livestreams/:id` | End livestream (soft delete) |
| `POST` | `/livestreams/:id/join` | Join livestream (get access token) |
| `POST` | `/livestreams/:id/leave` | Leave livestream |
| `GET` | `/livestreams/:id/participants` | List participants |
| `GET` | `/livestreams/:id/state` | Get real-time stream state |
| `GET` | `/livestreams/:id/events` | Subscribe to SSE updates |

### Example: Creating a Livestream

```bash
curl -X POST http://localhost:3001/api/v1/livestreams \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "my-stream",
    "title": "My Awesome Livestream",
    "description": "Join us for live coding!",
    "createdBy": "user-123",
    "maxParticipants": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "roomName": "my-stream",
    "title": "My Awesome Livestream",
    "status": "LIVE",
    "createdBy": "user-123",
    "maxParticipants": 100,
    "createdAt": "2025-11-09T10:00:00Z",
    "startedAt": "2025-11-09T10:00:00Z"
  }
}
```

### Example: Joining a Livestream

```bash
curl -X POST http://localhost:3001/api/v1/livestreams/abc-123/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "displayName": "John Doe",
    "role": "VIEWER"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "url": "wss://your-project.livekit.cloud",
    "participant": {
      "id": "participant-789",
      "userId": "user-456",
      "displayName": "John Doe",
      "role": "VIEWER",
      "status": "JOINED"
    }
  }
}
```

For complete API documentation, see [CLAUDE.md](./CLAUDE.md).

## Project Structure

```
favorited/
├── server/                    # Backend API
│   ├── src/
│   │   ├── services/         # Business logic layer
│   │   ├── routes/           # HTTP/SSE route handlers
│   │   ├── workers/          # Background job processors
│   │   ├── jobs/             # Scheduled jobs (cleanup, reconciliation)
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # Utility functions
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # Database migrations
│   ├── __tests__/            # Test suite (unit + integration)
│   └── Dockerfile            # Server container build
│
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Reusable UI components
│   │   │   └── livestream/  # Livestream-specific components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client layer
│   │   └── types/           # TypeScript type definitions
│   ├── Dockerfile            # Client container build
│   └── nginx.conf            # Nginx configuration
│
├── docker-compose.yml         # Service orchestration
├── package.json              # Root monorepo scripts
├── README.md                 # This file
└── CLAUDE.md                 # Detailed technical documentation
```

## Testing

### Running Tests

```bash
# Run all tests
cd server
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test suite
npm test -- services.test.ts
```

### Test Coverage

Current coverage:
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

For detailed testing documentation, see [server/TESTING.md](./server/TESTING.md).

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find and kill process using port 3001 (Windows)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Find and kill process using port 3001 (Mac/Linux)
lsof -ti:3001 | xargs kill -9
```

**Database connection errors:**
```bash
# Verify PostgreSQL is running
# Windows:
net start postgresql-x64-14

# Mac:
brew services list

# Test connection
psql -U postgres -h localhost -p 5432
```

**Redis connection errors:**
```bash
# Verify Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
# Windows (if installed via Chocolatey):
redis-server

# Mac:
brew services start redis

# Or use Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

**Prisma client errors:**
```bash
# Regenerate Prisma client
cd server
npm run prisma:generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

**Docker issues:**
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs -f server

# Restart services
docker-compose restart

# Remove all containers and volumes
docker-compose down -v
```

**LiveKit connection issues:**
- Verify credentials in `.env` are correct
- Check LiveKit project status at [cloud.livekit.io](https://cloud.livekit.io)
- Ensure `LIVEKIT_URL` includes protocol (https:// or wss://)
- Test connection: Visit LiveKit dashboard → Check project status

## Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Comprehensive technical documentation
  - Detailed API documentation
  - Architecture deep-dive
  - Service layer explanations
  - Webhook processing flow
  - Stream state tracking
  - Database schema
  - Development guidelines

- **[server/TESTING.md](./server/TESTING.md)**: Testing guide
  - Test organization
  - Writing unit tests
  - Writing integration tests
  - Mocking strategies
  - Debugging tests




## Support
- **Documentation**: See [CLAUDE.md](./CLAUDE.md) for detailed docs
- **LiveKit Support**: [LiveKit Documentation](https://docs.livekit.io)

## Acknowledgments

- [LiveKit](https://livekit.io) - Real-time video/audio infrastructure
- [Prisma](https://www.prisma.io) - Next-generation ORM
- [React](https://react.dev) - UI framework
- [Vite](https://vitejs.dev) - Build tool
- [Tailwind CSS](https://tailwindcss.com) - CSS framework
