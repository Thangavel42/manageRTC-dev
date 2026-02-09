/**
 * Development Configuration
 * Development-specific settings and overrides
 */

import env from './env.js';

/**
 * Development environment configuration
 */
const developmentConfig = {
  // Server Configuration
  server: {
    port: env.PORT,
    env: env.NODE_ENV,
    timeout: 300000, // 5 minutes (longer for debugging)
    trustProxy: false,
  },

  // Database Configuration
  database: {
    uri: env.MONGODB_URI,
    poolSize: 5, // Smaller pool for development
    autoIndex: env.DB_AUTO_INDEX,
    // Development-specific connection options
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    serverSelectionTimeoutMS: 10000,
  },

  // Session Configuration
  session: {
    secret: env.SESSION_SECRET || 'dev-session-secret-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // Allow HTTP in development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day (shorter for dev)
      sameSite: 'lax',
    },
  },

  // CORS Configuration (more permissive in development)
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Dev-Mode'],
  },

  // Rate Limiting (disabled in development)
  rateLimit: {
    enabled: false, // Disabled for easier testing
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: 1000, // Very high limit
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Compression Configuration
  compression: {
    enabled: env.ENABLE_COMPRESSION,
    threshold: 1024,
    level: 6,
  },

  // Logging Configuration (verbose in development)
  logging: {
    level: 'debug', // Verbose logging
    enableFileLogging: true,
    file: {
      errorLog: 'logs/dev-error.log',
      combinedLog: 'logs/dev-combined.log',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 7, // Keep 7 days of logs
    },
    // Development-specific console logging
    console: {
      colorize: true,
      timestamp: true,
      showLogLevel: true,
    },
  },

  // File Upload Configuration
  upload: {
    maxSizeMB: env.MAX_FILE_SIZE_MB,
    allowedTypes: env.ALLOWED_FILE_TYPES,
    storage: 'local',
    uploadDir: 'uploads/dev',
  },

  // Socket.IO Configuration
  socket: {
    path: env.SOCKET_IO_PATH,
    pingTimeout: env.SOCKET_IO_PING_TIMEOUT,
    pingInterval: env.SOCKET_IO_PING_INTERVAL,
    cors: {
      origin: '*',
      credentials: true,
    },
  },

  // Cache Configuration (disabled in development for fresh data)
  cache: {
    enabled: false, // Disable cache in development
    ttl: {
      SHORT: 60 * 1000, // 1 minute
      MEDIUM: 5 * 60 * 1000, // 5 minutes
      LONG: 15 * 60 * 1000, // 15 minutes
      VERY_LONG: 30 * 60 * 1000, // 30 minutes
    },
  },

  // Pagination Configuration
  pagination: {
    defaultPageSize: env.DEFAULT_PAGE_SIZE,
    maxPageSize: env.MAX_PAGE_SIZE,
  },

  // Security Headers (relaxed in development)
  security: {
    helmet: {
      contentSecurityPolicy: false, // Disabled for easier development
      hsts: false, // Disabled for HTTP in development
    },
  },

  // Monitoring Configuration
  monitoring: {
    sentry: env.SENTRY_DSN,
    enablePerformanceMonitoring: false, // Disabled in development
    enableErrorTracking: false, // Disabled in development
  },

  // Feature Flags
  features: {
    caching: false, // Disable cache in development
    rateLimiting: false, // Disable rate limiting in development
    cors: true,
    compression: true,
    swagger: true, // Enable Swagger documentation in development
  },

  // Development Mode Settings
  devMode: {
    enableMockData: false, // Set to true to use mock data
    enableDebugEndpoints: true, // Enable debug endpoints
    showSqlQueries: true, // Log database queries
    suppressEmails: true, // Don't send real emails in development
  },
};

/**
 * Export development configuration
 */
export default developmentConfig;

/**
 * Helper to check if current environment is development
 */
export const isDevelopment = () => env.NODE_ENV === 'development';
