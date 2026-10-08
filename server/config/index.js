const dotenv = require('dotenv');
const path = require('path');
const logger = require('./logger');

// Load environment variables from .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '../.env.production' 
  : process.env.NODE_ENV === 'test' 
    ? '../.env.test' 
    : '../.env';

dotenv.config({
  path: path.resolve(__dirname, envFile)
});

// Get NODE_ENV from environment, default to development
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_TEST = NODE_ENV === 'test';

// Server Configuration
const serverConfig = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: NODE_ENV,
  apiVersion: process.env.API_VERSION || 'v1',
  isProduction: IS_PRODUCTION,
  isDevelopment: IS_DEVELOPMENT,
  isTest: IS_TEST,
  // Additional server configuration
  timeout: parseInt(process.env.SERVER_TIMEOUT, 10) || 30000, // 30 seconds
  keepAliveTimeout: parseInt(process.env.SERVER_KEEP_ALIVE_TIMEOUT, 10) || 60000 // 60 seconds
};

// Database Configuration with production-specific settings
const dbConfig = {
  mongodbUri: process.env.MONGODB_URI || (IS_PRODUCTION 
    ? '' // In production, MongoDB URI is required
    : 'mongodb://localhost:27017/algrow'),
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || (IS_PRODUCTION ? 20 : 10),
    connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT, 10) || 5000,
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT, 10) || 45000
  }
};

// JWT Configuration with production-specific security settings
const jwtConfig = {
  secret: process.env.JWT_SECRET || (IS_PRODUCTION 
    ? '' // In production, JWT secret is required
    : 'algrow_jwt_secret_key'),
  expiresIn: process.env.JWT_EXPIRES_IN || (IS_PRODUCTION ? '1h' : '7d'), // Shorter expiration in production
  algorithm: process.env.JWT_ALGORITHM || 'HS256',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || (IS_PRODUCTION ? '7d' : '30d')
};

// Redis Configuration
const redisConfig = {
  url: process.env.REDIS_URL || (IS_PRODUCTION 
    ? '' // In production, Redis URL is required for caching
    : 'redis://localhost:6379'),
  options: {
    socket: {
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 5000,
      keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE, 10) || 60000
    },
    password: process.env.REDIS_PASSWORD || undefined
  }
};

// CORS Configuration with environment-specific settings
const corsConfig = {
  origin: process.env.CORS_ORIGIN || (IS_PRODUCTION 
    ? '' // In production, CORS origin should be specified explicitly
    : '*'),
  methods: process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',') : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: process.env.CORS_ALLOWED_HEADERS ? process.env.CORS_ALLOWED_HEADERS.split(',') : ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Request-Id'],
  credentials: process.env.CORS_CREDENTIALS === 'true' || false,
  maxAge: parseInt(process.env.CORS_MAX_AGE, 10) || 86400 // 24 hours
};

// Rate Limiting Configuration with environment-specific settings
const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || (IS_PRODUCTION ? 60 : 2000), // More requests allowed in development
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  }
};

// Log Configuration with environment-specific levels
const logConfig = {
  level: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug'),
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || (IS_PRODUCTION ? 14 : 7), // Keep logs for 14 days in production, 7 in dev
  format: process.env.LOG_FORMAT || (IS_PRODUCTION ? 'json' : 'combined')
};

// AI Model API Keys with environment-specific settings
const aiModelConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    baseUrl: process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io/v1'
  },
  kling: {
    apiKey: process.env.KLING_API_KEY || '',
    baseUrl: process.env.KLING_BASE_URL || 'https://api.kling.ai/v1',
    timeout: parseInt(process.env.KLING_TIMEOUT, 10) || 30000,
    maxRetries: parseInt(process.env.KLING_MAX_RETRIES, 10) || 2
  },
  glm4v: {
    apiKey: process.env.GLM4V_API_KEY || '',
    baseUrl: process.env.GLM4V_BASE_URL || 'https://api.glm4v.com/v1'
  },
  stability: {
    apiKey: process.env.STABILITY_API_KEY || '',
    baseUrl: process.env.STABILITY_BASE_URL || 'https://api.stability.ai/v2beta'
  },
  chromadb: {
    baseUrl: process.env.CHROMADB_URL || 'http://localhost:8000'
  },
  socialBlade: {
    apiKey: process.env.SOCIAL_BLADE_API_KEY || ''
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    useMockDataOnFailure: false,
    baseUrl: 'https://www.googleapis.com/youtube/v3'
  },
  replicate: {
    apiKey: process.env.REPLICATE_API_KEY || '',
    baseUrl: process.env.REPLICATE_BASE_URL || 'https://api.replicate.com/v1'
  },
  runway: {
    apiKey: process.env.RUNWAY_API_KEY || '',
    baseUrl: process.env.RUNWAY_BASE_URL || 'https://api.runwayml.com/v1'
  },
  gemini: {
                apiKey: process.env.GEMINI_API_KEY || '',
                baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1'
            },
            githubModels: {
                apiKey: process.env.GITHUB_MODELS_TOKEN || '',
                baseUrl: process.env.GITHUB_MODELS_BASE_URL || 'https://api.github.com'
            },
            stepAi: {
                apiKey: process.env.STEP_AI_API_KEY || '',
                baseUrl: process.env.STEP_AI_BASE_URL || 'https://api.stepai.tech/v1'
            },
            bigModel: {
                apiKey: process.env.BIG_MODEL_API_KEY || '',
                baseUrl: process.env.BIG_MODEL_BASE_URL || 'https://api.bigmodel.cn/v1'
            },
            ltx: {
                apiKey: process.env.LTX_API_KEY || '',
                baseUrl: process.env.LTX_BASE_URL || 'https://api.ltx.ai/v1'
            },
            longCat: {
                apiKey: process.env.LONGCAT_API_KEY || '',
                baseUrl: process.env.LONGCAT_BASE_URL || 'https://api.longcat.ai/v1'
            },
            wan27Video: {
                apiKey: process.env.WAN27_VIDEO_API_KEY || '',
                baseUrl: process.env.WAN27_VIDEO_BASE_URL || 'https://api.wan27.com/v1'
            },
            wan27I2V: {
            apiKey: process.env.WAN27_I2V_API_KEY || '',
            baseUrl: process.env.WAN27_I2V_BASE_URL || 'https://api.wan27.com/v1'
        },
        jimeng: {
            apiKey: process.env.JIMENG_API_KEY || '',
            baseUrl: process.env.JIMENG_BASE_URL || 'https://api.jimeng.ai/v1'
        }
};

// File Storage Configuration with environment-specific settings
const fileStorageConfig = {
  type: process.env.FILE_STORAGE_TYPE || (IS_PRODUCTION ? 'aws' : 'local'),
  local: {
    path: process.env.LOCAL_STORAGE_PATH || './uploads',
    maxFileSize: parseInt(process.env.LOCAL_MAX_FILE_SIZE, 10) || 50 * 1024 * 1024 // 50MB
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || '',
    endpoint: process.env.AWS_S3_ENDPOINT || undefined,
    usePathStyleEndpoint: process.env.AWS_USE_PATH_STYLE_ENDPOINT === 'true' || false,
    maxFileSize: parseInt(process.env.AWS_MAX_FILE_SIZE, 10) || 100 * 1024 * 1024 // 100MB
  }
};

// Notification Configuration
const notificationConfig = {
  smtp: {
    host: process.env.SMTP_HOST || (IS_PRODUCTION ? '' : 'smtp.example.com'),
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.FROM_EMAIL || (IS_PRODUCTION ? '' : 'from@example.com'),
    secure: process.env.SMTP_SECURE === 'true' || (IS_PRODUCTION ? true : false),
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true' || (IS_PRODUCTION ? true : false)
    }
  },
  enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true' || (IS_PRODUCTION ? true : false)
};

// Validate configuration for production environment
if (IS_PRODUCTION) {
  const requiredConfigs = [
    { name: 'MONGODB_URI', value: dbConfig.mongodbUri, configPath: 'db.mongodbUri' },
    { name: 'JWT_SECRET', value: jwtConfig.secret, configPath: 'jwt.secret' },
    { name: 'CORS_ORIGIN', value: corsConfig.origin, configPath: 'cors.origin' }
  ];
  
  const missingConfigs = requiredConfigs.filter(config => !config.value);
  
  if (missingConfigs.length > 0) {
    logger.error('Missing required configuration for production environment:', {
      missing: missingConfigs.map(config => ({
        envVar: config.name,
        configPath: config.configPath
      }))
    });
    
    if (process.env.EXIT_ON_MISSING_CONFIG === 'true' || process.env.EXIT_ON_MISSING_CONFIG === undefined) {
      process.exit(1);
    }
  }
  
  logger.info('Production environment configuration validation passed');
}

// Export all configurations
module.exports = {
  server: serverConfig,
  db: dbConfig,
  jwt: jwtConfig,
  redis: redisConfig,
  cors: corsConfig,
  rateLimit: rateLimitConfig,
  log: logConfig,
  aiModel: aiModelConfig,
  fileStorage: fileStorageConfig,
  notification: notificationConfig,
  // Export environment flags for easy access
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST
};
