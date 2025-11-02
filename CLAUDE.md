# CLAUDE.md

## Project Overview

**Favorited** is a full-stack TypeScript application for managing livestreams with LiveKit. The project consists of:
- **Server**: Node.js/Express API (Livestream Orchestrator) for managing LiveKit room lifecycle and state
- **Client**: React web application for the frontend

## Tech Stack

### Server (API)
- **Runtime**: Node.js 20+ with TypeScript 5.9.3
- **Framework**: Express.js 4.21.2
- **Database**: PostgreSQL with Prisma ORM 6.2.0
- **Real-time Communication**: LiveKit Server SDK 2.14.0
- **Message Queue**: BullMQ with Redis (for webhook processing)
- **State Management**: Redis for ephemeral stream state (24h TTL)
- **Real-time Updates**: Server-Sent Events (SSE) with Redis Pub/Sub
- **Dev Tools**: tsx (TypeScript execution)

### Client (Frontend)
- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.7
- **Language**: TypeScript 5.9.3
- **Linting**: ESLint 9.36.0

## Project Structure

```
favorited/                    # Monorepo root
├── server/                   # Backend API
│   ├── src/
│   │   ├── services/         # Service layer (business logic)
│   │   │   ├── livekit.service.ts     # LiveKit API integration
│   │   │   ├── database.service.ts    # Prisma database operations
│   │   │   ├── livestream.service.ts  # Orchestration layer
│   │   │   ├── queue.service.ts       # Redis queue for webhook processing
│   │   │   └── state.service.ts       # Real-time stream state tracking
│   │   ├── routes/           # API routes
│   │   │   ├── livestream.routes.ts   # Livestream endpoints
│   │   │   ├── state.routes.ts        # Stream state endpoints (SSE)
│   │   │   └── webhook.routes.ts      # LiveKit webhook receiver
│   │   ├── workers/          # Background job processors
│   │   │   └── webhook.worker.ts      # Processes webhooks from queue
│   │   ├── jobs/             # Scheduled jobs
│   │   │   └── webhook-cleanup.job.ts # Cleans expired webhook records
│   │   ├── types/            # TypeScript type definitions
│   │   │   └── livestream.types.ts
│   │   ├── utils/            # Utility functions
│   │   │   └── errors.ts     # Custom error classes
│   │   └── index.ts          # Express server entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # Database migrations
│   ├── .env                  # Environment variables (DO NOT COMMIT)
│   ├── .env.example          # Environment template
│   ├── package.json          # Server dependencies
│   └── tsconfig.json         # Server TypeScript config
│
├── client/                   # Frontend React app
│   ├── src/
│   │   ├── assets/           # Static assets
│   │   ├── App.tsx           # Main component
│   │   ├── App.css           # Application styles
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── public/               # Public static files
│   ├── index.html            # HTML entry point
│   ├── package.json          # Client dependencies
│   ├── tsconfig.json         # Client TypeScript config
│   ├── vite.config.ts        # Vite configuration
│   └── eslint.config.js      # ESLint configuration
│
├── package.json              # Root monorepo scripts
├── CLAUDE.md                 # This file
└── README.md                 # Project readme
```

## Development Commands

### From Root Directory

```bash
# Install all dependencies (client + server)
npm run install:all

# Start both client and server in dev mode
npm run dev

# Start only server
npm run dev:server

# Start only client
npm run dev:client

# Build both client and server
npm run build

# Prisma commands (database)
npm run prisma:generate      # Generate Prisma client
npm run prisma:migrate       # Run database migrations
npm run prisma:studio        # Open Prisma Studio (DB GUI)
```

### Server Commands (from /server)

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run prisma:generate      # Generate Prisma client types
npm run prisma:migrate       # Create and run migrations
npm run prisma:studio        # Database management GUI
```

### Client Commands (from /client)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## API Documentation

### Base URL
- Development: `http://localhost:3001/api/v1`
- Health Check: `http://localhost:3001/health`

### Endpoints

#### Create Livestream
```http
POST /api/v1/livestreams
Content-Type: application/json

{
  "roomName": "my-livestream",
  "title": "My Awesome Livestream",
  "description": "Optional description",
  "createdBy": "user-id-123",
  "maxParticipants": 100,
  "emptyTimeout": 600,
  "metadata": { "key": "value" }
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "roomName": "my-livestream",
    "title": "My Awesome Livestream",
    "status": "LIVE",
    "createdBy": "user-id-123",
    "maxParticipants": 100,
    "emptyTimeout": 600,
    "createdAt": "2025-11-01T...",
    "startedAt": "2025-11-01T...",
    ...
  }
}
```

#### List Livestreams
```http
GET /api/v1/livestreams?status=LIVE&limit=10&offset=0

Response: 200 OK
{
  "success": true,
  "data": [...],
  "count": 10
}
```

#### Get Livestream by ID
```http
GET /api/v1/livestreams/:id

Response: 200 OK
{
  "success": true,
  "data": { ... }
}
```

#### Delete Livestream
```http
DELETE /api/v1/livestreams/:id
Content-Type: application/json

{
  "requestingUserId": "user-id-123"
}

Response: 200 OK
{
  "success": true,
  "message": "Livestream deleted successfully",
  "data": {
    "id": "uuid",
    "roomName": "my-livestream",
    "status": "ENDED",
    "endedAt": "2025-11-01T...",
    ...
  }
}

Error Responses:
- 400: requestingUserId not provided
- 403: User is not the creator (authorization failed)
- 404: Livestream not found
```

**Delete Behavior:**
- **Soft Delete**: Sets status to `ENDED`, preserves record for history
- **Authorization**: Only the creator (`createdBy`) can delete their livestream
- **LiveKit Room**: Immediately deletes the room, disconnecting all active participants
- **Idempotent**: Deleting an already ended livestream returns success

**Note**: In production, `requestingUserId` would come from authentication middleware (JWT, session, etc.) rather than request body.

#### Join Livestream
```http
POST /api/v1/livestreams/:id/join
Content-Type: application/json

{
  "userId": "user-id-123",
  "displayName": "John Doe",
  "role": "VIEWER",  // or "HOST" (only creator can be HOST)
  "metadata": { "key": "value" }  // optional
}

Response: 200 OK
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "url": "wss://your-project.livekit.cloud",
    "participant": {
      "id": "uuid",
      "livestreamId": "livestream-uuid",
      "userId": "user-id-123",
      "displayName": "John Doe",
      "role": "VIEWER",
      "status": "JOINED",
      "joinedAt": "2025-11-01T...",
      "leftAt": null,
      "metadata": { "key": "value" }
    }
  }
}

Error Responses:
- 400: Invalid request (missing fields, invalid role, livestream not LIVE)
- 403: User not authorized to join as HOST (only creator can be HOST)
- 404: Livestream not found
- 409: User already an active participant
```

**Join Behavior:**
- **Authentication**: Only authenticated users can join (userId required)
- **Authorization**: Only the livestream creator can join as HOST role
- **Access Token**: Returns a LiveKit JWT token valid for 24 hours (configurable via `TOKEN_EXPIRATION_HOURS`)
- **Participant Record**: Creates a database record to track participation
- **Permissions**:
  - **HOST**: Can publish audio/video and subscribe to others
  - **VIEWER**: Can only subscribe (watch/listen), cannot publish

**Note**: In production, `userId` would come from authentication middleware.

#### Leave Livestream
```http
POST /api/v1/livestreams/:id/leave
Content-Type: application/json

{
  "userId": "user-id-123"
}

Response: 200 OK
{
  "success": true,
  "message": "Left livestream successfully"
}

Error Responses:
- 400: userId not provided
- 404: Livestream not found
```

**Leave Behavior:**
- **Status Update**: Marks participant status as `LEFT` with timestamp
- **Idempotent**: Calling leave multiple times is safe
- **Automatic**: LiveKit webhooks also trigger leave when participants disconnect

**Note**: Clients can also disconnect without calling this endpoint. The webhook handler will automatically update participant status when LiveKit sends `participant_left` events.

#### Get Participants
```http
GET /api/v1/livestreams/:id/participants?status=JOINED&role=VIEWER&limit=50&offset=0

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "livestreamId": "livestream-uuid",
      "userId": "user-id-123",
      "displayName": "John Doe",
      "role": "VIEWER",
      "status": "JOINED",
      "joinedAt": "2025-11-01T...",
      "leftAt": null,
      "metadata": { ... }
    },
    ...
  ],
  "count": 5
}

Query Parameters:
- status: Filter by JOINED or LEFT
- role: Filter by HOST or VIEWER
- limit: Number of results to return
- offset: Number of results to skip
```

#### Get Stream State
```http
GET /api/v1/livestreams/:id/state

Response: 200 OK
{
  "success": true,
  "data": {
    "streamId": "abc123",
    "status": "LIVE",
    "participants": ["user-id-123", "user-id-456"],
    "startedAt": "2025-11-02T10:00:00Z",
    "viewerCount": 2,
    "totalViewers": 5,
    "peakViewerCount": 3,
    "hostInfo": {
      "userId": "user-id-123",
      "displayName": "My Awesome Livestream"
    }
  }
}

Error Responses:
- 400: Livestream ID is required
- 404: Stream state not found
```

**Get State Behavior:**
- **Ephemeral**: State is stored in Redis with 24-hour TTL
- **Real-time**: Reflects current stream status
- **No Authentication**: Public endpoint (anyone can view state)
- **State Properties**:
  - `streamId`: Livestream unique identifier
  - `status`: Current status ("LIVE" or "ENDED")
  - `participants`: Array of active participant user IDs
  - `startedAt`: ISO 8601 timestamp when stream started
  - `viewerCount`: Current number of viewers
  - `totalViewers`: Total number of unique viewers (all-time)
  - `peakViewerCount`: Highest concurrent viewer count
  - `hostInfo`: Creator information

#### Subscribe to Stream Events (SSE)
```http
GET /api/v1/livestreams/:id/events

Response: 200 OK (Server-Sent Events stream)
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: state
data: {"streamId":"abc123","status":"LIVE",...}

event: room_started
data: {"streamId":"abc123","status":"LIVE",...}

event: viewer_count_update
data: {"streamId":"abc123","viewerCount":5,...}

event: room_ended
data: {"streamId":"abc123","status":"ENDED",...}

Error Responses:
- 400: Livestream ID is required
- 404: Stream state not found
```

**SSE Behavior:**
- **Long-lived Connection**: Keeps HTTP connection open for real-time updates
- **Event Types**:
  - `state`: Initial state sent immediately on connection (always first event)
  - `room_started`: Stream goes live (broadcast to all subscribers)
  - `viewer_count_update`: Viewer count changed (throttled - see below)
  - `room_ended`: Stream finishes (broadcast, then connection closes)
- **Throttling**: Viewer count updates are throttled to prevent excessive broadcasts:
  - Maximum 1 update per 5 seconds
  - Only broadcast if count changes by ≥10% OR ≥5 viewers
- **Automatic Reconnection**: Browser `EventSource` API handles reconnection
- **No Authentication**: Public endpoint (anyone can subscribe)

**Client Example (JavaScript/Browser):**
```javascript
const eventSource = new EventSource('http://localhost:3001/api/v1/livestreams/abc123/events');

// Initial state (sent immediately)
eventSource.addEventListener('state', (e) => {
  const state = JSON.parse(e.data);
  console.log('Current state:', state);
  updateUI(state);
});

// Room lifecycle events
eventSource.addEventListener('room_started', (e) => {
  const state = JSON.parse(e.data);
  console.log('Stream started:', state);
  showNotification('Stream is now live!');
});

eventSource.addEventListener('room_ended', (e) => {
  const state = JSON.parse(e.data);
  console.log('Stream ended:', state);
  showNotification('Stream has ended');
  eventSource.close(); // Clean up
});

// Viewer count updates
eventSource.addEventListener('viewer_count_update', (e) => {
  const state = JSON.parse(e.data);
  console.log('Viewers:', state.viewerCount);
  updateViewerCount(state.viewerCount);
});

// Error handling
eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

**Note**: Participant join/leave events update internal state but do NOT trigger SSE broadcasts. Only room lifecycle and viewer count changes are broadcast.

#### LiveKit Webhook
```http
POST /api/v1/webhooks/livekit
Authorization: <LiveKit webhook signature>
Content-Type: application/json

{
  "event": "participant_joined",
  "room": {
    "sid": "RM_...",
    "name": "my-livestream"
  },
  "participant": {
    "sid": "PA_...",
    "identity": "user-id-123",
    "name": "John Doe"
  },
  "createdAt": 1234567890
}

Response: 200 OK
{
  "success": true,
  "message": "Webhook processed"
}
```

**Webhook Behavior:**
- **Signature Verification**: Validates webhook came from LiveKit
- **Events Handled**:
  - `participant_joined`: Logs participant connection (record already created during join) + updates stream state (no SSE broadcast)
  - `participant_left`: Automatically marks participant as LEFT in database + updates stream state (no SSE broadcast)
  - `room_started`: Logs room activation + broadcasts SSE event to subscribers
  - `room_finished`: Marks all active participants as LEFT + broadcasts SSE event + closes SSE connections
- **State Updates**: Webhooks automatically update stream state in Redis and trigger SSE broadcasts where applicable
- **Automatic**: No manual setup required - just configure URL in LiveKit dashboard
- **Configuration**: Set webhook URL in LiveKit dashboard to: `https://yourapp.com/api/v1/webhooks/livekit`

### Livestream Status Flow
- **SCHEDULED**: Created in database, waiting for LiveKit room creation
- **LIVE**: LiveKit room successfully created and active
- **ENDED**: Livestream has concluded or been deleted
- **ERROR**: LiveKit room creation failed

## Environment Setup

### Server Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/favorited?schema=public"

# LiveKit Credentials (get from https://cloud.livekit.io)
LIVEKIT_URL=https://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Access token expiration in hours (default: 24)
TOKEN_EXPIRATION_HOURS=24
```

### Database Setup

1. Install PostgreSQL locally or use a hosted service
2. Create a database: `createdb favorited`
3. Update `DATABASE_URL` in `.env`
4. Run migrations: `npm run prisma:migrate`
5. Generate Prisma client: `npm run prisma:generate`

Alternatively, use Prisma's local dev database:
```bash
cd server
npx prisma dev
```

### LiveKit Setup

**Option 1: LiveKit Cloud (Recommended for development)**
1. Sign up at [cloud.livekit.io](https://cloud.livekit.io)
2. Create a new project
3. Copy credentials to `.env`

**Option 2: Local LiveKit Server**
```bash
# Install LiveKit server
brew install livekit  # macOS
# or download from livekit.io/download

# Run in dev mode
livekit-server --dev

# Use these credentials in .env:
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

## Docker Setup

### Prerequisites
- Docker (20.10+) and Docker Compose (2.0+)
- LiveKit credentials (from [cloud.livekit.io](https://cloud.livekit.io))

### Quick Start with Docker

#### 1. Configure Environment Variables
Copy the Docker environment example file and configure LiveKit credentials:
```bash
cp .env.docker.example .env
```

Edit `.env` and add your LiveKit credentials:
```bash
LIVEKIT_URL=https://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
TOKEN_EXPIRATION_HOURS=24
WEBHOOK_QUEUE_CONCURRENCY=10
```

#### 2. Run in Production Mode
Start all services (PostgreSQL, Redis, Server, Client):
```bash
docker-compose --profile prod up -d
```

This will:
- Start PostgreSQL database on port 5432
- Start Redis on port 6379
- Start server API on port 3001
- Start client on port 80 (served by nginx)
- Automatically run database migrations

Access the application:
- **Client**: http://localhost
- **API**: http://localhost:3001/api/v1
- **Health Check**: http://localhost:3001/health

#### 3. Run in Development Mode
For development with hot reload:
```bash
docker-compose --profile dev up
```

This starts development versions with:
- Server with hot reload (tsx) on port 3001
- Client with Vite dev server on port 5173
- Volume mounts for live code changes

Access the development servers:
- **Client Dev**: http://localhost:5173
- **API Dev**: http://localhost:3001/api/v1

#### 4. Debugging with VS Code/Cursor

The development server includes remote debugging support on port 9229.

**Setup:**
1. Start the development server:
   ```bash
   docker-compose --profile dev up
   ```

2. In VS Code/Cursor, open the Debug panel (Ctrl+Shift+D / Cmd+Shift+D)

3. Select "Attach to Docker Server" from the dropdown

4. Click the green play button or press F5

**Features:**
- **Breakpoints**: Set breakpoints in your TypeScript source files
- **Hot Reload**: Code changes trigger automatic restart with debugger reattachment
- **Source Maps**: Full TypeScript debugging support with source maps
- **Variables**: Inspect variables, call stack, and watch expressions
- **Console**: View logs and evaluate expressions in debug console

**Debugging Configuration** (`.vscode/launch.json`):
```json
{
  "name": "Attach to Docker Server",
  "type": "node",
  "request": "attach",
  "address": "localhost",
  "port": 9229,
  "restart": true,
  "localRoot": "${workspaceFolder}/server",
  "remoteRoot": "/app"
}
```

**Troubleshooting:**
- If debugger won't attach, ensure the server is running: `docker-compose logs server-dev`
- Check port 9229 is mapped: `docker-compose ps server-dev`
- Restart container if needed: `docker-compose restart server-dev`

### Docker Architecture

#### Services Overview

```
┌─────────────────────────────────────────────┐
│           Docker Compose Stack              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │PostgreSQL│  │  Redis   │  │  Server  │ │
│  │  :5432   │  │  :6379   │  │  :3001   │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│       │             │             │        │
│       └─────────────┴─────────────┘        │
│                     │                      │
│              ┌──────────┐                  │
│              │  Client  │                  │
│              │   :80    │                  │
│              └──────────┘                  │
│                                             │
└─────────────────────────────────────────────┘
```

#### Container Details

**postgres** (postgres:15-alpine)
- Database for application data
- Persistent volume: `postgres_data`
- Health check: `pg_isready`
- Auto-configured with credentials

**redis** (redis:7-alpine)
- Message queue for webhook processing
- Persistent volume: `redis_data`
- Append-only mode enabled
- Health check: `redis-cli ping`

**server** (Node.js 20-alpine)
- Express API with LiveKit integration
- Multi-stage build (development/production)
- Auto-runs Prisma migrations on startup
- Health check: `/health` endpoint
- Non-root user for security

**client** (nginx:alpine in production)
- React frontend served by nginx
- Multi-stage build with Vite
- Gzip compression enabled
- SPA routing with fallback to index.html
- Health check: nginx status

### Docker Commands

#### Managing Services
```bash
# Start all services (production)
docker-compose up -d

# Start with development profile
docker-compose --profile dev up

# Stop all services
docker-compose down

# Stop and remove volumes (deletes data!)
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f server

# Restart a service
docker-compose restart server

# Rebuild containers after code changes
docker-compose up -d --build
```

#### Database Operations
```bash
# Run Prisma migrations
docker-compose exec server npx prisma migrate deploy

# Generate Prisma client
docker-compose exec server npx prisma generate

# Access Prisma Studio
docker-compose exec server npx prisma studio

# Connect to PostgreSQL directly
docker-compose exec postgres psql -U favorited -d favorited
```

#### Redis Operations
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Check queue status
docker-compose exec redis redis-cli KEYS "bull:*"

# Monitor Redis commands
docker-compose exec redis redis-cli MONITOR
```

#### Health Checks
```bash
# Check all services health
docker-compose ps

# Check API health
curl http://localhost:3001/health

# Check specific service logs
docker-compose logs --tail=100 server
```

### Docker Files Structure

```
favorited/
├── docker-compose.yml           # Service orchestration
├── .env                         # Environment variables (don't commit)
├── .env.docker.example          # Environment template
├── server/
│   ├── Dockerfile              # Server multi-stage build
│   └── .dockerignore           # Excludes for server build
└── client/
    ├── Dockerfile              # Client multi-stage build
    ├── nginx.conf              # Nginx configuration
    └── .dockerignore           # Excludes for client build
```

### Multi-Stage Builds

Both Dockerfiles use multi-stage builds for optimization:

**Development Stage**
- Full Node.js with all dependencies
- Volume mounts for live code changes
- Hot reload enabled

**Production Stage**
- Minimal production dependencies
- Optimized layer caching
- Non-root user
- Health checks
- Security headers (client)

### Volume Persistence

Docker volumes persist data across container restarts:

- `postgres_data`: Database files
- `redis_data`: Redis persistence (AOF)

To backup volumes:
```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U favorited favorited > backup.sql

# Restore PostgreSQL
docker-compose exec -T postgres psql -U favorited favorited < backup.sql
```

### Environment Variables

**Required** (set in `.env`):
- `LIVEKIT_URL`: Your LiveKit server URL
- `LIVEKIT_API_KEY`: LiveKit API key
- `LIVEKIT_API_SECRET`: LiveKit API secret

**Optional** (with defaults):
- `TOKEN_EXPIRATION_HOURS=24`: JWT token lifetime
- `WEBHOOK_QUEUE_CONCURRENCY=10`: Worker concurrency

**Auto-configured** (by docker-compose):
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection
- `NODE_ENV`: production/development
- `PORT`: Server port

### Networking

All services communicate on the `favorited-network` bridge network:
- Services reference each other by name (e.g., `postgres:5432`)
- Client can access server at `http://server:3001`
- Isolated from other Docker networks

### Troubleshooting Docker

#### Services won't start
```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs server

# Verify environment variables
docker-compose config
```

#### Database connection issues
```bash
# Verify PostgreSQL is healthy
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec server npx prisma db pull
```

#### Redis connection issues
```bash
# Verify Redis is healthy
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test connection
docker-compose exec server node -e "require('ioredis').createClient(process.env.REDIS_URL).ping().then(console.log)"
```

#### Port conflicts
If ports 80, 3001, 5432, or 6379 are in use:
```bash
# Find process using port
netstat -ano | findstr :3001  # Windows

# Stop conflicting service or change ports in docker-compose.yml
```

#### Out of disk space
```bash
# Remove unused containers, images, volumes
docker system prune -a --volumes

# Check Docker disk usage
docker system df
```

### Production Deployment

For production deployments:

1. **Use docker-compose.override.yml** for environment-specific config
2. **Enable HTTPS** with a reverse proxy (nginx, Traefik)
3. **Use secrets management** (Docker secrets, AWS Secrets Manager)
4. **Set up monitoring** (Prometheus, Grafana)
5. **Configure backups** for PostgreSQL and Redis
6. **Use orchestration** (Docker Swarm, Kubernetes) for scaling
7. **Enable logging** (ELK stack, CloudWatch)

Example production override:
```yaml
# docker-compose.override.yml (not committed)
version: '3.9'

services:
  server:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

## Database Schema

### Livestream Model
```prisma
model Livestream {
  id               String            @id @default(uuid())
  roomName         String            @unique
  title            String
  description      String?
  status           LivestreamStatus  @default(SCHEDULED)
  createdBy        String
  maxParticipants  Int               @default(100)
  emptyTimeout     Int               @default(86400)
  metadata         Json?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  startedAt        DateTime?
  endedAt          DateTime?
  participants     Participant[]     // Relation to participants
}

enum LivestreamStatus {
  SCHEDULED
  LIVE
  ENDED
  ERROR
}
```

### Participant Model
```prisma
model Participant {
  id                      String            @id @default(uuid())
  livestreamId            String
  livestream              Livestream        @relation(fields: [livestreamId], references: [id], onDelete: Cascade)
  userId                  String
  displayName             String
  role                    ParticipantRole   @default(VIEWER)
  status                  ParticipantStatus @default(JOINED)
  metadata                Json?

  // LiveKit session identifiers (for race condition-safe operations)
  livekitParticipantSid   String?           @unique  // LiveKit's unique participant session ID (PA_xxx)
  livekitRoomSid          String?                    // LiveKit's room session ID (RM_xxx)

  joinedAt                DateTime          @default(now())
  leftAt                  DateTime?

  // Unique constraint: One active session per user per livestream
  @@unique([livestreamId, userId, status])
  @@index([livestreamId, status])
  @@index([userId])
  @@index([livekitParticipantSid])
}

enum ParticipantRole {
  HOST    // Can publish audio/video and subscribe
  VIEWER  // Can only subscribe (watch/listen)
}

enum ParticipantStatus {
  JOINED  // Currently in the livestream
  LEFT    // Has left the livestream
}
```

### WebhookEvent Model
```prisma
model WebhookEvent {
  id          String    @id  // LiveKit webhook ID (for deduplication)
  event       String         // Event type (participant_joined, participant_left, etc.)
  processedAt DateTime  @default(now())
  expiresAt   DateTime       // For cleanup - TTL of 24 hours

  @@index([id])
  @@index([expiresAt])
}
```

## Stream State Tracking Architecture

### Overview
The system implements real-time stream state tracking using Redis for ephemeral storage and Server-Sent Events (SSE) for push-based client updates. State updates are triggered by LiveKit webhook events and broadcast to subscribed clients.

### Architecture Flow
```
Client → SSE Subscribe → State Service → Redis Pub/Sub
  ↓                          ↓
SSE Connection          Subscribe to Channel
  ↓                          ↓
Receive Events    ←─────  Redis Publish
                              ↑
Webhook → Queue → Worker → Update State → Publish Event
```

### Components

#### 1. State Service (`state.service.ts`)
- **Responsibility**: Manage stream state and SSE connections
- **Redis Operations**:
  - Store state in Redis hashes with 24h TTL
  - Publish state events via Redis Pub/Sub
  - Subscribe to state channels for SSE broadcasting
- **SSE Management**:
  - Maintain active SSE connections per stream
  - Broadcast events to all subscribers
  - Graceful connection cleanup on errors/shutdown
- **Viewer Count Throttling**:
  - Throttle broadcasts (max 1 per 5 seconds)
  - Threshold: ≥10% change OR ≥5 viewers
  - Prevents excessive SSE traffic

#### 2. State Routes (`state.routes.ts`)
- **GET /livestreams/:id/state**: Return current state snapshot
- **GET /livestreams/:id/events**: Establish SSE connection

#### 3. Redis State Storage
- **Key Pattern**: `stream:state:{livestreamId}`
- **Data Structure**: JSON-serialized StreamState object
- **TTL**: 24 hours (automatic cleanup)
- **Pub/Sub Channel**: `stream:events:{livestreamId}`

#### 4. Integration with Webhooks
Webhook events trigger state updates:
- **participant_joined**: Update state (participants, viewerCount, totalViewers, peak)
- **participant_left**: Update state (participants, viewerCount)
- **room_started**: Broadcast SSE event to subscribers
- **room_finished**: Update state to ENDED + broadcast SSE + close connections

### State Object Structure
```typescript
{
  streamId: string;           // Livestream ID
  status: "LIVE" | "ENDED";   // Current status
  participants: string[];      // Array of active user IDs
  startedAt: string;          // ISO 8601 timestamp
  viewerCount: number;        // Current viewers
  totalViewers: number;       // All-time unique viewers
  peakViewerCount: number;    // Highest concurrent viewers
  hostInfo: {
    userId: string;
    displayName: string;
  };
}
```

### SSE Event Types
- **state**: Initial state (sent immediately on connection)
- **room_started**: Stream goes live
- **viewer_count_update**: Viewer count changed (throttled)
- **room_ended**: Stream finished

### Scalability
- **Current**: Single server handles ~1,000 concurrent participants per stream
- **Horizontal Scaling**: Multiple servers share Redis Pub/Sub (fan-out to all subscribers)
- **Connection Distribution**: SSE connections distributed across servers
- **State Consistency**: Redis ensures consistent state across servers

### Monitoring
State service health metrics available via `/health` endpoint:
```json
{
  "state": {
    "status": "healthy",
    "details": {
      "activeConnections": 50,     // Total SSE connections
      "subscribedStreams": 10      // Streams with active subscriptions
    }
  }
}
```

### Lifecycle Management
- **Initialization**: State created when livestream goes LIVE
- **Updates**: Triggered by webhook events (participant join/leave)
- **Broadcasts**: Only room lifecycle and viewer count updates
- **Cleanup**: Automatic TTL-based expiration (24h) + manual cleanup on room_ended

### Error Handling
- **SSE Connection Errors**: Gracefully close connection, client auto-reconnects
- **Redis Pub/Sub Errors**: Log error, connection remains open for retry
- **State Not Found**: Return 404 for GET requests, prevent SSE subscription

## Webhook Processing Architecture

### Overview
The system implements a production-grade webhook processing architecture with queue-based processing, deduplication, transaction safety, and automatic cleanup.

### Architecture Flow
```
LiveKit → Webhook Endpoint → Signature Verification → Redis Queue → Worker → Database
                ↓                                                        ↓
            Return 200                                          Deduplication Check
                                                                       ↓
                                                              Process Event (Transaction)
                                                                       ↓
                                                              Record as Processed
```

### Components

#### 1. Webhook Receiver (`webhook.routes.ts`)
- **Responsibility**: Receive and validate webhooks from LiveKit
- **Flow**:
  1. Verify webhook signature (security)
  2. Add to Redis queue (async, non-blocking)
  3. Return 200 immediately (LiveKit requirement)
- **Benefits**: Fast response time, no timeout issues, handles spikes

#### 2. Redis Queue (`queue.service.ts`)
- **Technology**: BullMQ with Redis
- **Features**:
  - Job persistence (survives server restarts)
  - Automatic retries with exponential backoff (3 attempts)
  - Concurrency control (configurable via `WEBHOOK_QUEUE_CONCURRENCY`)
  - Job deduplication (webhook ID as job ID)
- **Configuration**:
  - Default concurrency: 10 jobs simultaneously
  - Retry delay: 1s, 2s, 4s (exponential backoff)

#### 3. Webhook Worker (`webhook.worker.ts`)
- **Responsibility**: Process webhooks from the queue
- **Flow**:
  1. Fetch job from queue
  2. Check if already processed (deduplication)
  3. Record as being processed (prevents race conditions)
  4. Process event via livestream service
  5. Mark job as complete
- **Error Handling**: Failed jobs automatically retry via BullMQ

#### 4. Livestream Service (`livestream.service.ts`)
- **Handles these webhook events**:
  - `participant_joined`: Updates participant record with LiveKit SIDs
  - `participant_left`: Marks participant as LEFT using SID (transaction-safe)
  - `room_started`: Logs room activation
  - `room_finished`: Marks all active participants as LEFT
- **Transaction Safety**: Uses `markParticipantAsLeftBySid()` for atomic operations

#### 5. Cleanup Job (`webhook-cleanup.job.ts`)
- **Purpose**: Prevent unbounded database growth
- **Frequency**: Runs every hour
- **Action**: Deletes webhook records older than 24 hours

### Race Condition Prevention

#### Problem: Multiple webhooks for same participant
LiveKit may send multiple `participant_left` webhooks due to:
- Multiple track disconnections (audio, video, data)
- Network retries
- Connection issues

#### Solution: LiveKit Participant SID
- **Before**: Used `(userId, livestreamId)` → Could update wrong session
- **After**: Use `livekitParticipantSid` (unique per session) → Targets exact participant

#### Implementation
```typescript
// Transaction-safe method using LiveKit SID
async markParticipantAsLeftBySid(livekitParticipantSid: string): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    const participant = await tx.participant.findUnique({
      where: { livekitParticipantSid },
    });

    if (!participant || participant.status === 'LEFT') {
      return false; // Idempotent
    }

    await tx.participant.update({
      where: { id: participant.id },
      data: { status: 'LEFT', leftAt: new Date() },
    });

    return true;
  });
}
```

### Deduplication Strategy

#### Database-Level Deduplication
- **WebhookEvent table**: Stores processed webhook IDs
- **Check before processing**: Skip if webhook ID exists
- **Record after processing**: Insert webhook ID with 24h TTL
- **Handles race conditions**: Unique constraint on webhook ID

#### Queue-Level Deduplication
- **Job ID = Webhook ID**: BullMQ won't create duplicate jobs
- **Benefits**: Prevents queue bloat from retries

### Scalability

#### Current Capacity
- **Concurrent participants**: ~1,000 per livestream
- **Simultaneous livestreams**: ~100
- **Webhook throughput**: 10 concurrent workers (configurable)

#### Horizontal Scaling (Future)
The architecture is designed for easy scaling:
- **Multiple servers**: Share same Redis queue
- **Worker scaling**: Increase `WEBHOOK_QUEUE_CONCURRENCY`
- **Redis clustering**: For higher queue throughput
- **Pub/Sub fan-out**: For real-time notifications to clients

### Monitoring & Health Checks

#### Health Endpoint (`/health`)
Returns comprehensive system status:
```json
{
  "success": true,
  "components": {
    "api": { "status": "healthy" },
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "queue": {
      "status": "healthy",
      "details": {
        "waiting": 0,
        "active": 2,
        "completed": 150,
        "failed": 0
      }
    }
  }
}
```

#### Queue Metrics
- **Waiting jobs**: Webhooks queued for processing
- **Active jobs**: Currently being processed
- **Completed**: Successfully processed count
- **Failed**: Failed job count (investigate if > 0)

### Environment Configuration

#### New Redis Variables
```bash
# Redis connection URL (required)
REDIS_URL=redis://localhost:6379

# Webhook queue worker concurrency (default: 10)
WEBHOOK_QUEUE_CONCURRENCY=10
```

#### Local Development Setup
1. Install Redis: `brew install redis` (macOS) or use Docker
2. Start Redis: `redis-server` or `docker run -p 6379:6379 redis`
3. Update `.env`: Add `REDIS_URL=redis://localhost:6379`
4. Server automatically starts queue worker on startup

### Troubleshooting

#### Issue: Webhooks not being processed
- **Check Redis connection**: Visit `/health` endpoint
- **Check queue status**: Look at queue details in health check
- **Check worker logs**: Look for `[Worker]` prefixed logs

#### Issue: High failed job count
- **Check database connection**: Failures may be due to DB issues
- **Check webhook structure**: LiveKit may have changed webhook format
- **Check logs**: Failed jobs log error details

#### Issue: Duplicate participant processing
- **Verify SID storage**: Check `livekitParticipantSid` is populated
- **Check deduplication**: Verify webhook IDs are unique
- **Review logs**: Look for "already processed" messages

## Development Guidelines

### Server-Side Best Practices
- **Service Layer Pattern**: Business logic in services, routes handle HTTP only
- **Error Handling**: Use custom error classes (ValidationError, NotFoundError, etc.)
- **Type Safety**: All services and routes are fully typed with TypeScript
- **Separation of Concerns**: LiveKit operations separate from database operations
- **Graceful Shutdown**: Server handles SIGTERM/SIGINT for clean database disconnection

### Client-Side Best Practices
- Use functional components with hooks
- Prefer `const` for component declarations
- Use React 19 features when appropriate
- Keep components small and focused on a single responsibility
- Extract reusable logic into custom hooks

### Code Style
- Follow ESLint rules configured in the project
- Use meaningful variable and function names
- Keep files under 300 lines when possible
- Add JSDoc comments for public APIs

### TypeScript
- Use strict TypeScript configuration
- Prefer type inference where possible
- Define explicit types for function parameters and return values
- Use interfaces for object shapes

## Architecture

### Server Architecture Layers

1. **Routes Layer** (`src/routes/`)
   - HTTP request/response handling
   - Request validation
   - Response formatting

2. **Service Layer** (`src/services/`)
   - **Livestream Service**: Orchestration and business logic
   - **LiveKit Service**: LiveKit API interactions
   - **Database Service**: Prisma database operations

3. **Data Layer**
   - Prisma ORM for type-safe database access
   - PostgreSQL for persistent storage

### Data Flow
```
HTTP Request
  → Route Handler
    → Livestream Service (orchestration)
      → Database Service (save record)
      → LiveKit Service (create room)
      → Database Service (update status)
    ← Response Formatting
  ← HTTP Response
```

## Git Workflow

- **Main Branch**: `main`
- Commit messages should be clear and descriptive
- Keep commits atomic and focused

## Implemented Features

### Participant Management (✅ Completed)
- **Access Token Generation**: Generate LiveKit JWT tokens for participants to join rooms
- **Join/Leave Endpoints**: API endpoints for joining and leaving livestreams
- **Role-Based Permissions**: HOST (can publish) and VIEWER (can only subscribe) roles
- **Webhook Handler**: Automatic participant tracking via LiveKit webhooks
- **Participant Tracking**: Database records of all participants with join/leave timestamps
- **Query Participants**: List active or historical participants with filters

## Future Enhancements

### Planned Features
- Room update endpoint (change settings like maxParticipants, emptyTimeout)
- Recording and streaming capabilities (record livestreams, stream to RTMP)
- Analytics and usage tracking (viewer counts, watch time, engagement metrics)
- Full authentication system (replace userId/requestingUserId with JWT/session middleware)
- Invite system (private livestreams with invite codes)
- Chat functionality (real-time messaging during livestreams)

### Infrastructure
- ✅ Docker containerization (completed)
- Add testing (Jest, Vitest, React Testing Library)
- Add CI/CD pipelines
- Add monitoring and logging (Winston, Sentry)
- Add API documentation (Swagger/OpenAPI)
- Add rate limiting and authentication

## Platform

- **OS**: Windows (win32)
- **Node.js**: v20.19+ required (Vite 7 requirement)
- **Package Manager**: npm
- **Database**: PostgreSQL 14+

## Notes for AI

- Server uses modular service architecture for clean separation of concerns
- All LiveKit operations go through the LiveKit service layer
- Database operations use Prisma for type safety
- API uses `/api/v1/` versioning for future compatibility
- Room names are sanitized to be LiveKit-compatible (alphanumeric, hyphens, underscores)
- Livestream status transitions automatically: SCHEDULED → LIVE (or ERROR if creation fails)
- **Participant Management**: Users join via API, receive JWT tokens, and are tracked in database
  - Only livestream creators can join as HOST role
  - Access tokens expire after TOKEN_EXPIRATION_HOURS (default: 24 hours)
  - Webhooks automatically update participant status when they leave
- **Webhooks**: LiveKit sends signed webhooks for events (participant_joined, participant_left, room_finished, etc.)
  - Signature verification prevents unauthorized webhook calls
  - Webhook handler is idempotent and returns 200 even on errors to prevent retries
  - Webhooks trigger stream state updates and SSE broadcasts where applicable
- **Stream State Tracking**: Real-time ephemeral state stored in Redis with Server-Sent Events for client updates
  - State initialized when livestream goes LIVE
  - Tracks viewer count, peak viewers, participants (user IDs), and host info
  - SSE broadcasts: room_started, room_ended, viewer_count_update (throttled)
  - Participant join/leave updates state but does NOT broadcast via SSE
  - State TTL: 24 hours (automatic cleanup)
  - SSE uses Redis Pub/Sub for multi-server scalability
  - Public endpoints (no authentication required)
- Always maintain TypeScript type safety across both client and server
