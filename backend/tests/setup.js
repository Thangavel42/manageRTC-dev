/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/managertest_db';
process.env.CLERK_SECRET_KEY = 'test_secret_key';
process.env.JWT_SECRET = 'test_jwt_secret';

// Mock environment variables for development
process.env.isDevelopment = 'false';

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging test failures
  error: console.error,
};

// Mock Socket.IO
global.mockSocketIO = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  to: jest.fn(() => global.mockSocketIO),
  emit: jest.fn(),
};

// Setup test database connection
beforeAll(async () => {
  // Database connection will be handled in individual test files
  // to allow for proper cleanup
});

// Global teardown
afterAll(async () => {
  // Cleanup will be handled in individual test files
});

// Mock Clerk authentication
jest.mock('@clerk/express', () => ({
  requireAuth: jest.fn((req, res, next) => {
    // Mock authenticated user
    req.auth = {
      userId: 'test_user_id',
      companyId: 'test_company_id',
      role: 'admin'
    };
    next();
  }),
  clerkMiddleware: jest.fn((req, res, next) => {
    req.auth = {
      userId: 'test_user_id',
      companyId: 'test_company_id',
      role: 'admin'
    };
    next();
  })
}));

// Mock Socket.IO broadcaster
// Note: This module may not exist yet - the mock is here for when it's created
jest.mock('../utils/socketBroadcaster.js', () => ({
  broadcastToCompany: jest.fn(),
  broadcastToUser: jest.fn(),
  broadcastToAll: jest.fn()
}), { virtual: true });
