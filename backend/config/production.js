/**
 * Production Configuration
 * Production-specific settings and overrides
 */

import env from './env.js';

/**
 * Production environment configuration
 */
const productionConfig = {
  // Server Configuration
  server: {
    port: env.PORT,
    env: env.NODE_ENV,
    timeout: 120000, // 2 minutes
    trustProxy: true, // Enable when behind reverse proxy
  },

  // Database Configuration
  database: {
    uri: env.MONGODB_URI,
    poolSize: env.DB_POOL_SIZE,
    autoIndex: env.DB_AUTO_INDEX,
    // Production-specific connection options
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    maxIdleTimeMS: 60000,
    retryWrites: true,
    w: 'majority',
  },

  // Session Configuration
  session: {
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // HTTPS only in production
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    },
  },

  // CORS Configuration
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Rate Limiting Configuration
  rateLimit: {
    enabled: env.ENABLE_RATE_LIMITING,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Compression Configuration
  compression: {
    enabled: env.ENABLE_COMPRESSION,
    threshold: 1024, // Only compress responses larger than 1KB
    level: 6, // Compression level (0-9)
  },

  // Logging Configuration
  logging: {
    level: env.LOG_LEVEL,
    enableFileLogging: env.ENABLE_FILE_LOGGING,
    // Production-specific file logging
    file: {
      errorLog: 'logs/error.log',
      combinedLog: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 14, // Keep 14 days of logs
    },
  },

  // File Upload Configuration
  upload: {
    maxSizeMB: env.MAX_FILE_SIZE_MB,
    allowedTypes: env.ALLOWED_FILE_TYPES,
    // Production storage options
    storage: 'local', // or 's3' for AWS S3
    uploadDir: 'uploads',
  },

  // Socket.IO Configuration
  socket: {
    path: env.SOCKET_IO_PATH,
    pingTimeout: env.SOCKET_IO_PING_TIMEOUT,
    pingInterval: env.SOCKET_IO_PING_INTERVAL,
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  },

  // Cache Configuration
  cache: {
    enabled: env.ENABLE_CACHING,
    ttl: {
      SHORT: 5 * 60 * 1000, // 5 minutes
      MEDIUM: 15 * 60 * 1000, // 15 minutes
      LONG: 60 * 60 * 1000, // 1 hour
      VERY_LONG: 4 * 60 * 60 * 1000, // 4 hours
    },
  },

  // Pagination Configuration
  pagination: {
    defaultPageSize: env.DEFAULT_PAGE_SIZE,
    maxPageSize: env.MAX_PAGE_SIZE,
  },

  // Security Headers
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", env.FRONTEND_URL],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
    },
  },

  // Monitoring Configuration
  monitoring: {
    sentry: env.SENTRY_DSN,
    enablePerformanceMonitoring: true,
    enableErrorTracking: true,
  },

  // Feature Flags
  features: {
    caching: env.ENABLE_CACHING,
    rateLimiting: env.ENABLE_RATE_LIMITING,
    cors: env.ENABLE_CORS,
    compression: env.ENABLE_COMPRESSION,
    swagger: false, // Disable Swagger in production
  },
};

/**
 * Export production configuration
 */
export default productionConfig;

/**
 * Helper to check if current environment is production
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Helper to get current config based on environment
 */
export const getConfig = () => {
  if (isProduction()) {
    return productionConfig;
  }
  // Import and return development config if not in production
  return import('./development.js').then(m => m.default);
};
