/**
 * Livestream Orchestrator API Server
 * Main entry point for the Express application
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import livestreamRoutes from './routes/livestream.routes.js';
import stateRoutes from './routes/state.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { databaseService } from './services/database.service.js';
import { queueService } from './services/queue.service.js';
import { stateService } from './services/state.service.js';
import { startWebhookWorker, stopWebhookWorker } from './workers/webhook.worker.js';
import { startCleanupJob, stopCleanupJob } from './jobs/webhook-cleanup.job.js';
import { startReconciliationJob, stopReconciliationJob } from './jobs/livestream-cleanup.job.js';
import { AppError } from './utils/errors.js';
import type { ErrorResponse } from './types/livestream.types.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// ===========================================
// Middleware Configuration
// ===========================================

// CORS - Allow cross-origin requests with proper security
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, be more lenient
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[CORS] Warning: allowing origin ${origin} in development mode`);
      return callback(null, true);
    }

    // Reject in production
    console.error(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));

// Rate Limiting - Prevent DoS attacks and API abuse
// General API rate limit (100 requests per 15 minutes per IP)
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip rate limiting for health checks and webhooks
  skip: (req) => req.path === '/health' || req.path.startsWith('/api/v1/webhooks'),
});

// Stricter rate limit for write operations (20 requests per hour per IP)
const writeOperationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many write operations from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limit for creating livestreams (5 per hour per IP)
const createLivestreamLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many livestream creation requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiter to all API routes
app.use('/api/v1/', generalApiLimiter);

// Body parsing middleware
// IMPORTANT: Raw body parser for webhooks must come BEFORE JSON/urlencoded parsers
// LiveKit sends webhooks with 'application/webhook+json' content type
app.use('/api/v1/webhooks', express.raw({
  type: ['application/json', 'application/webhook+json']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ===========================================
// API Routes
// ===========================================

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Check Redis connection
    const redisConnected = await queueService.isRedisConnected();

    // Get queue health status
    const queueHealth = await queueService.getHealthStatus();

    // Get state service health status
    const stateHealth = await stateService.getHealthStatus();

    // Overall health status
    const isHealthy = redisConnected && queueHealth.isHealthy && stateHealth.isHealthy;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy
        ? 'Livestream Orchestrator API is running'
        : 'Service degraded - check component status',
      timestamp: new Date().toISOString(),
      components: {
        api: {
          status: 'healthy',
          message: 'Express server is running',
        },
        database: {
          status: 'healthy',
          message: 'PostgreSQL connection active',
        },
        redis: {
          status: redisConnected ? 'healthy' : 'unhealthy',
          message: redisConnected
            ? 'Redis connection active'
            : 'Redis connection failed',
        },
        queue: {
          status: queueHealth.isHealthy ? 'healthy' : 'unhealthy',
          message: queueHealth.isHealthy
            ? 'Webhook queue operational'
            : 'Webhook queue unavailable',
          details: queueHealth.isHealthy ? {
            waiting: queueHealth.waiting,
            active: queueHealth.active,
            completed: queueHealth.completed,
            failed: queueHealth.failed,
          } : undefined,
        },
        state: {
          status: stateHealth.isHealthy ? 'healthy' : 'unhealthy',
          message: stateHealth.isHealthy
            ? 'State service operational'
            : 'State service unavailable',
          details: stateHealth.isHealthy ? {
            activeConnections: stateHealth.activeConnections,
            subscribedStreams: stateHealth.subscribedStreams,
          } : undefined,
        },
      },
    });
  } catch (error) {
    // Health check should not crash the server
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// API v1 routes
// Apply stricter rate limits to specific write operations
app.post('/api/v1/livestreams', createLivestreamLimiter); // Create livestream
app.delete('/api/v1/livestreams/:id', writeOperationsLimiter); // Delete livestream
app.post('/api/v1/livestreams/:id/join', writeOperationsLimiter); // Join livestream
app.post('/api/v1/livestreams/:id/leave', writeOperationsLimiter); // Leave livestream

// Mount routes
app.use('/api/v1/livestreams', livestreamRoutes);
app.use('/api/v1/livestreams', stateRoutes); // State routes for /livestreams/:id/state and /livestreams/:id/events
app.use('/api/v1/webhooks', webhookRoutes);

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ===========================================
// Error Handling Middleware
// ===========================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log error for debugging
  console.error('Error:', err);

  // Handle custom application errors
  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: err.constructor.name,
      message: err.message,
      statusCode: err.statusCode,
    };

    return res.status(err.statusCode).json({
      success: false,
      ...errorResponse,
    });
  }

  // Handle unknown errors
  const errorResponse: ErrorResponse = {
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'An unexpected error occurred',
    statusCode: 500,
  };

  return res.status(500).json({
    success: false,
    ...errorResponse,
  });
});

// ===========================================
// Server Startup and Shutdown
// ===========================================

async function startServer() {
  try {
    // Test database connection
    await databaseService.connect();
    console.log('✓ Database connected successfully');

    // Start webhook worker (for processing LiveKit webhooks from queue)
    startWebhookWorker();
    console.log('✓ Webhook worker started');

    // Start webhook cleanup job (removes expired webhook records)
    startCleanupJob();
    console.log('✓ Webhook cleanup job started');

    // Start livestream reconciliation job (syncs database with LiveKit state)
    startReconciliationJob();
    console.log('✓ Livestream reconciliation job started');

    // Start Express server
    app.listen(PORT, () => {
      console.log('===========================================');
      console.log('  Livestream Orchestrator API');
      console.log('===========================================');
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Server running on: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
      console.log('===========================================');
      console.log('Redis URL:', process.env.REDIS_URL || 'redis://localhost:6379');
      console.log('Webhook queue concurrency:', process.env.WEBHOOK_QUEUE_CONCURRENCY || '10');
      console.log('===========================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function shutdown() {
  console.log('\nShutting down gracefully...');

  try {
    // Stop cleanup jobs first
    stopCleanupJob();
    console.log('✓ Webhook cleanup job stopped');

    stopReconciliationJob();
    console.log('✓ Livestream reconciliation job stopped');

    // Stop webhook worker (wait for in-flight jobs to complete)
    await stopWebhookWorker();
    console.log('✓ Webhook worker stopped');

    // Shutdown state service (close SSE connections and Redis)
    await stateService.shutdown();
    console.log('✓ State service shutdown');

    // Shutdown queue service
    await queueService.shutdown();
    console.log('✓ Queue service shutdown');

    // Disconnect from database
    await databaseService.disconnect();
    console.log('✓ Database disconnected');

    console.log('Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();
