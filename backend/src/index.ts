import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import vehicleRoutes from './routes/vehicle.routes';
import telemetryRoutes from './routes/telemetry.routes';
import predictionRoutes from './routes/prediction.routes';
import appointmentRoutes from './routes/appointment.routes';
import feedbackRoutes from './routes/feedback.routes';
import alertRoutes from './routes/alert.routes';
import agentRoutes from './routes/agent.routes';
import dashboardRoutes from './routes/dashboard.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';

// Import services
import { logger } from './utils/logger';
import { RedisService } from './services/redis.service';

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AutoSentry AI API',
      version: '1.0.0',
      description: 'API for AutoSentry AI Predictive Vehicle Maintenance Platform',
      contact: {
        name: 'AutoSentry Team',
        email: 'api@autosentry.ai'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      },
      {
        url: 'https://api.autosentry.ai',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Vehicles', description: 'Vehicle management' },
      { name: 'Telemetry', description: 'Vehicle telemetry data' },
      { name: 'Predictions', description: 'ML predictions' },
      { name: 'Appointments', description: 'Service appointments' },
      { name: 'Feedback', description: 'Customer feedback' },
      { name: 'Alerts', description: 'Alerts and notifications' },
      { name: 'Agents', description: 'AI Agent orchestration' },
      { name: 'UEBA', description: 'Security and anomaly detection' },
      { name: 'RCA', description: 'Root Cause Analysis' }
    ]
  },
  apis: ['./src/routes/*.ts', './src/types/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ============================================
// MIDDLEWARE
// ============================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// CORS
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
  'http://localhost:5173', 
  'http://localhost:3000',
  'https://vayuv-autosentry-ey-techathon-6-0-1.onrender.com',
  'https://vayuv.onrender.com'
];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.http(message.trim())
  }
}));
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// ============================================
// ROUTES
// ============================================

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AutoSentry AI API Docs'
}));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'autosentry-backend'
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/predictions', predictionRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const server = createServer(app);

async function startServer() {
  try {
    // Initialize Redis connection (non-blocking, app works without it)
    try {
      await RedisService.getInstance().connect();
      logger.info('Redis connection established');
    } catch (redisError) {
      logger.warn('Redis not available, running without cache');
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 AutoSentry Backend running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
});

startServer();

export { app, server };
