const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./config/logger');

// Create Express app
const app = express();

// Enable CORS
app.use(cors({
  origin: config.cors.origin
}));

// Set security headers - disable Cross-Origin-Resource-Policy for static files
app.use(helmet({
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  }
}));

// Rate limiting - only apply to API routes, not to health check or metrics
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  }
});

// Parse JSON requests
app.use(express.json({
  limit: '10mb'
}));

// Parse URL-encoded requests
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// Serve static files for uploaded videos
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', (req, res, next) => {
  // Add CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}, express.static(uploadsDir));

// Connect to MongoDB
mongoose.connect(config.db.mongodbUri)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.warn('Failed to connect to MongoDB:', error);
    logger.warn('Server will continue running without database connection for demonstration purposes');
  });

// Root route - redirect to API docs or return API info
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to One Spark API',
    status: 'ok',
    service: 'one-spark-backend',
    version: config.server.apiVersion,
    api_docs: `http://localhost:${config.server.port}/api-docs`,
    health_check: `http://localhost:${config.server.port}/health`,
    api_base_url: `http://localhost:${config.server.port}/api/${config.server.apiVersion}`
  });
});

// Health check route with detailed metrics
app.get('/health', (req, res) => {
  // Get system metrics
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  // Get video generation service health status if available
  let videoServiceHealth = 'unknown';
  let videoServiceLastCheck = 'never';
  
  try {
    const videoGeneratorService = require('./services/videoGeneratorService');
    if (videoGeneratorService.isHealthy !== undefined) {
      videoServiceHealth = videoGeneratorService.isHealthy ? 'healthy' : 'unhealthy';
      videoServiceLastCheck = new Date(videoGeneratorService.lastHealthCheck).toISOString();
    }
  } catch (error) {
    // Service might not be initialized yet
  }
  
  // Get total number of video tasks if available
  let videoTaskCount = 0;
  let videoTaskStatuses = {};
  
  try {
    const videoGeneratorController = require('./controllers/video-generator');
    if (global.videoTasks) {
      videoTaskCount = Object.keys(global.videoTasks).length;
      // Count tasks by status
      videoTaskStatuses = Object.values(global.videoTasks).reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});
    }
  } catch (error) {
    // Tasks might not be available
  }
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'one-spark-backend',
    version: config.server.apiVersion,
    environment: config.server.nodeEnv,
    uptime: process.uptime(),
    metrics: {
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
      }
    },
    services: {
      videoGeneration: {
        status: videoServiceHealth,
        lastHealthCheck: videoServiceLastCheck
      }
    },
    videoTasks: {
      total: videoTaskCount,
      byStatus: videoTaskStatuses
    }
  });
});

// Prometheus metrics endpoint (for monitoring tools)
app.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Format metrics in Prometheus format
  const metrics = `# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}

# HELP process_memory_rss_bytes Process resident set size in bytes
# TYPE process_memory_rss_bytes gauge
process_memory_rss_bytes ${memoryUsage.rss}

# HELP process_memory_heap_total_bytes Process heap total in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP process_memory_heap_used_bytes Process heap used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP process_memory_external_bytes Process external memory in bytes
# TYPE process_memory_external_bytes gauge
process_memory_external_bytes ${memoryUsage.external}

# HELP one_spark_video_tasks_total Total number of video generation tasks
# TYPE one_spark_video_tasks_total gauge
one_spark_video_tasks_total ${Object.keys(global.videoTasks || {}).length}
`;
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Admin auth routes
const adminAuthRoutes = require('./routes/admin-auth');
app.use(`/api/${config.server.apiVersion}/admin/auth`, adminAuthRoutes);

// Admin dashboard routes
const adminRoutes = require('./routes/admin');
app.use(`/api/${config.server.apiVersion}/admin`, adminRoutes);

// API routes - apply rate limiting only to API endpoints
const apiRoutes = require('./routes/api');
app.use(`/api/${config.server.apiVersion}`, limiter, apiRoutes);

// Swagger documentation
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'One Spark API',
      version: config.server.apiVersion,
      description: 'API documentation for One Spark platform',
      contact: {
        name: 'One Spark Team',
        email: 'support@onespark.online'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}/api/${config.server.apiVersion}`,
        description: 'Development server'
      }
    ]
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  
  // Default error response
  let statusCode = err.status || 500;
  let message = err.message || 'Internal Server Error';
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(error => error.message).join(', ');
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  // Return consistent error format that frontend expects
  res.status(statusCode).json({
    status: statusCode,
    error: message, // Use 'error' property for frontend compatibility
    message: message // Keep 'message' for backward compatibility
  });
});

// Start server
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
  logger.info(`API version: ${config.server.apiVersion}`);
  logger.info(`API docs available at: http://localhost:${PORT}/api-docs`);
}).on('error', (error) => {
  logger.error('Server startup error:', error);
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please free the port and try again.`);
  }
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    mongoose.disconnect()
      .then(() => {
        logger.info('MongoDB connection closed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Error closing MongoDB connection:', error);
        process.exit(1);
      });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    mongoose.disconnect()
      .then(() => {
        logger.info('MongoDB connection closed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Error closing MongoDB connection:', error);
        process.exit(1);
      });
  });
});

module.exports = app;
