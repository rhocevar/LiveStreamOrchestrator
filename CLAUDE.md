# CLAUDE.md

## Project Overview

**Favorited** is a full-stack TypeScript application for managing livestreams with LiveKit. The project consists of:
- **Server**: Node.js/Express API (Livestream Orchestrator) for managing LiveKit room lifecycle and state
- **Client**: React web application for the frontend

## Tech Stack

### Server (API)
- **Runtime**: Node.js with TypeScript 5.9.3
- **Framework**: Express.js 4.21.2
- **Database**: PostgreSQL with Prisma ORM 6.2.0
- **Real-time Communication**: LiveKit Server SDK 2.14.0
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
│   │   │   └── livestream.service.ts  # Orchestration layer
│   │   ├── routes/           # API routes
│   │   │   ├── livestream.routes.ts   # Livestream endpoints
│   │   │   └── webhook.routes.ts      # LiveKit webhook handler
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
  - `participant_joined`: Logs participant connection (record already created during join)
  - `participant_left`: Automatically marks participant as LEFT in database
  - `room_started`: Logs room activation
  - `room_finished`: Marks all active participants as LEFT
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
  id            String            @id @default(uuid())
  livestreamId  String
  livestream    Livestream        @relation(fields: [livestreamId], references: [id], onDelete: Cascade)
  userId        String
  displayName   String
  role          ParticipantRole   @default(VIEWER)
  status        ParticipantStatus @default(JOINED)
  metadata      Json?
  joinedAt      DateTime          @default(now())
  leftAt        DateTime?

  @@index([livestreamId, status])
  @@index([userId])
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
- Add testing (Jest, Vitest, React Testing Library)
- Add CI/CD pipelines
- Add monitoring and logging (Winston, Sentry)
- Add API documentation (Swagger/OpenAPI)
- Add rate limiting and authentication
- Docker containerization

## Platform

- **OS**: Windows (win32)
- **Node.js**: v18+ required
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
- Always maintain TypeScript type safety across both client and server
