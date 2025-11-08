# Favorited API - Bruno Collection

This directory contains the Bruno API collection for testing the Favorited API endpoints.

## Prerequisites

1. **Install Bruno**: Download from [usebruno.com](https://www.usebruno.com/) or install via package manager:
   ```bash
   # macOS
   brew install bruno

   # Windows
   choco install bruno

   # Or download from GitHub releases
   ```

2. **Start the API server**:
   ```bash
   # From root directory
   npm run dev:server

   # Or with Docker
   docker-compose --profile dev up
   ```

## Getting Started

### 1. Open Collection in Bruno

1. Launch Bruno
2. Click "Open Collection"
3. Navigate to `c:\dev\favorited\bruno`
4. Select the `Favorited API` folder

### 2. Select Environment

Bruno will use the environment variables defined in the `environments/` folder:
- **Local**: For local development (localhost:3001)
- **Docker**: For Docker development (same as local for now)

Select an environment from the dropdown in the top-right corner.

### 3. Test the API

#### Basic Testing Flow

1. **Health Check** - Verify the server is running
   - Run: `Health Check.bru`
   - Expected: 200 OK with all components healthy

2. **Create Livestream** - Create a test livestream
   - Run: `Livestreams/Create Livestream.bru`
   - This will automatically set the `livestreamId` variable for subsequent requests

3. **Join as Host** - Join the livestream as the creator
   - Run: `Livestreams/Participants/Join as Host.bru`
   - Expected: 200 OK with JWT token

4. **Join as Viewer** - Join as a viewer
   - Run: `Livestreams/Participants/Join as Viewer.bru`
   - Expected: 200 OK with JWT token (viewer permissions)

5. **Get Stream State** - Check real-time stream state
   - Run: `State/Get Stream State.bru`
   - Expected: Current viewer count, participants, and stats

6. **Get Participants** - List all participants
   - Run: `Livestreams/Participants/Get Participants.bru`
   - Expected: Array of participants (HOST and VIEWERs)

7. **Leave Livestream** - Remove a participant
   - Run: `Livestreams/Participants/Leave Livestream.bru`
   - Expected: 200 OK confirmation

8. **Delete Livestream** - End the livestream
   - Run: `Livestreams/Delete Livestream.bru`
   - Expected: 200 OK with status changed to ENDED

## Collection Structure

```
bruno/
├── bruno.json                          # Collection metadata
├── environments/
│   ├── Local.bru                       # Local development environment
│   └── Docker.bru                      # Docker environment
└── Favorited API/
    ├── Health Check.bru                # Server health check
    ├── Livestreams/
    │   ├── Create Livestream.bru       # POST /api/v1/livestreams
    │   ├── List Livestreams.bru        # GET /api/v1/livestreams
    │   ├── Get Livestream.bru          # GET /api/v1/livestreams/:id
    │   ├── Delete Livestream.bru       # DELETE /api/v1/livestreams/:id
    │   └── Participants/
    │       ├── Join as Host.bru        # POST /api/v1/livestreams/:id/join (HOST)
    │       ├── Join as Viewer.bru      # POST /api/v1/livestreams/:id/join (VIEWER)
    │       ├── Leave Livestream.bru    # POST /api/v1/livestreams/:id/leave
    │       └── Get Participants.bru    # GET /api/v1/livestreams/:id/participants
    ├── State/
    │   ├── Get Stream State.bru        # GET /api/v1/livestreams/:id/state
    │   └── Subscribe to Events (SSE).bru # GET /api/v1/livestreams/:id/events
    └── Webhooks/
        └── LiveKit Webhook.bru         # POST /api/v1/webhooks/livekit
```

## Environment Variables

The collection uses these variables (defined in `environments/*.bru`):

- `baseUrl`: API base URL (default: `http://localhost:3001`)
- `apiVersion`: API version (default: `v1`)
- `testUserId`: Test user ID for viewers (default: `test-user-123`)
- `testCreatorId`: Test creator ID for hosts (default: `creator-456`)

### Dynamic Variables

These variables are automatically set by request scripts:

- `livestreamId`: Set after creating a livestream
- `roomName`: Set after creating a livestream
- `hostToken`: Set after joining as host
- `viewerToken`: Set after joining as viewer
- `hostParticipantId`: Set after joining as host
- `viewerParticipantId`: Set after joining as viewer

## Features

### Automated Tests

Each request includes automated tests that verify:
- Response status codes
- Response structure
- Data validation
- Business logic

Tests run automatically after each request and display in Bruno's test panel.

### Request Documentation

Each request includes documentation in the `docs` section:
- Endpoint description
- Authorization requirements
- Special notes and caveats

### Script Automation

Requests use post-response scripts to:
- Extract values from responses
- Set variables for subsequent requests
- Enable workflow automation

## Testing Server-Sent Events (SSE)

Bruno may not fully support SSE streaming. To test the SSE endpoint:

### Using Browser EventSource API

```javascript
const eventSource = new EventSource('http://localhost:3001/api/v1/livestreams/YOUR_LIVESTREAM_ID/events');

// Initial state
eventSource.addEventListener('state', (e) => {
  console.log('Current state:', JSON.parse(e.data));
});

// Room started
eventSource.addEventListener('room_started', (e) => {
  console.log('Stream started:', JSON.parse(e.data));
});

// Viewer count updates
eventSource.addEventListener('viewer_count_update', (e) => {
  console.log('Viewers:', JSON.parse(e.data).viewerCount);
});

// Room ended
eventSource.addEventListener('room_ended', (e) => {
  console.log('Stream ended:', JSON.parse(e.data));
  eventSource.close();
});

// Error handling
eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

### Using curl

```bash
curl -N http://localhost:3001/api/v1/livestreams/YOUR_LIVESTREAM_ID/events
```

## Testing Webhooks

The LiveKit webhook endpoint is called automatically by LiveKit in production. For local testing:

1. **Without Signature Verification**: Manually send webhook payloads using the `LiveKit Webhook.bru` request

2. **With LiveKit Cloud**: Configure your webhook URL in the LiveKit dashboard:
   - Go to your project settings
   - Add webhook URL: `http://your-ngrok-url/api/v1/webhooks/livekit`
   - Use ngrok or similar to expose your local server

## Tips

1. **Run in Sequence**: Execute requests in the order listed above for the best testing experience

2. **Check Variables**: Use Bruno's environment panel to view/edit variables at any time

3. **Reuse Tokens**: JWT tokens are valid for 24 hours by default, so you can reuse them across multiple tests

4. **Reset State**: Delete and recreate livestreams to reset state for fresh testing

5. **Monitor Logs**: Keep the server logs open to see webhook processing and state updates in real-time

6. **Use Health Check**: Run the health check before testing to ensure all services (database, Redis, queue) are running

## Troubleshooting

### Issue: "livestreamId not set"

**Solution**: Run "Create Livestream" first to set the variable

### Issue: "403 Forbidden" when joining as HOST

**Solution**: Ensure the `userId` in the request matches the `createdBy` field of the livestream (use `testCreatorId`)

### Issue: "404 Not Found" for stream state

**Solution**: Stream state is only created when a livestream is LIVE. Create a livestream first.

### Issue: Health check shows "unhealthy"

**Solution**:
- Check PostgreSQL is running: `docker-compose ps postgres` or verify local PostgreSQL
- Check Redis is running: `docker-compose ps redis` or verify local Redis
- Check server logs for connection errors

## Version Control

This Bruno collection is committed to Git for team collaboration. To update:

1. Make changes in Bruno
2. Files are automatically saved to disk
3. Commit changes: `git add bruno/ && git commit -m "Update API tests"`
4. Push to share with team

## Resources

- [Bruno Documentation](https://docs.usebruno.com/)
- [Favorited API Documentation](../CLAUDE.md)
- [LiveKit Documentation](https://docs.livekit.io/)
