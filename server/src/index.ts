/**
 * Livestream Orchestrator API Server
 * Main entry point for the Express application
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import livestreamRoutes from './routes/livestream.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { databaseService } from './services/database.service.js';
import { AppError } from './utils/errors.js';
import type { ErrorResponse } from './types/livestream.types.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// ===========================================
// Middleware Configuration
// ===========================================

// CORS - Allow cross-origin requests
app.use(cors());

// Body parsing middleware
// Skip JSON parsing for webhook routes (they need raw body for signature verification)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/webhooks')) {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ===========================================
// API Routes
// ===========================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Livestream Orchestrator API is running',
    timestamp: new Date().toISOString(),
  });
});

// API v1 routes
app.use('/api/v1/livestreams', livestreamRoutes);
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

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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

  res.status(500).json({
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
    await databaseService.disconnect();
    console.log('✓ Database disconnected');
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
