/**
 * Jest Configuration for manageRTC Backend
 * Testing framework for REST API controllers and utilities
 *
 * Note: This project uses ES Modules ("type": "module" in package.json)
 */

export default {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests - include both tests and other directories
  roots: ['<rootDir>/tests', '<rootDir>/services', '<rootDir>/integration-tests', '<rootDir>/edge-cases'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/__tests__/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Module paths
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Transform configuration for ES modules
  transform: {
    '^.+\\.js$': [
      'babel-jest',
      {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                node: 'current'
              },
              modules: 'auto'
            }
          ]
        ]
      }
    ]
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test timeout (60 seconds for database operations)
  testTimeout: 60000,

  // Verbose output
  verbose: true,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Module name mapper for absolute imports
  moduleNameMapper: {
    '^@controllers/(.*)$': '<rootDir>/controllers/rest/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',

    // Mock for @jest/globals since we're using node test globals
    '^@jest/globals$': '<rootDir>/tests/mocks/jest-globals.js'
  },

  // Ignore transformations for node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(@mongodb-memory-server))'
  ]
};
