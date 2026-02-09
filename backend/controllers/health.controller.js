/**
 * Health Check Controller
 * Comprehensive health monitoring for the application
 * Checks database, cache, external services, and system resources
 */

import { client } from '../config/db.js';
import os from 'os';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

/**
 * Get system health information
 */
const getSystemHealth = () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = (usedMem / totalMem) * 100;

  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  // Get uptime in seconds
  const uptime = process.uptime();

  // Get disk usage
  const getAppDiskUsage = () => {
    try {
      const appDir = process.cwd();
      const stats = fs.statSync(appDir);
      return { available: true, path: appDir };
    } catch (error) {
      return { available: false, error: error.message };
    }
  };

  return {
    uptime: Math.floor(uptime),
    uptimeFormatted: formatUptime(uptime),
    memory: {
      total: Math.round(totalMem / 1024 / 1024 / 1024), // GB
      used: Math.round(usedMem / 1024 / 1024 / 1024), // GB
      free: Math.round(freeMem / 1024 / 1024 / 1024), // GB
      usagePercent: Math.round(memUsagePercent * 100) / 100,
      status: memUsagePercent > 90 ? 'critical' : memUsagePercent > 70 ? 'warning' : 'healthy'
    },
    cpu: {
      cores: cpus.length,
      loadAverage: loadAvg.map(avg => Math.round(avg * 100) / 100),
      model: cpus[0]?.model || 'unknown'
    },
    disk: getAppDiskUsage(),
    platform: {
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname()
    }
  };
};

/**
 * Format uptime to human-readable string
 */
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Check database connectivity
 */
const checkDatabase = async () => {
  const start = Date.now();
  try {
    // Check if MongoDB client is connected
    if (!client || !client.topology || !client.topology.isConnected?.()) {
      return {
        status: 'unhealthy',
        message: 'MongoDB client is not connected',
        responseTime: Date.now() - start
      };
    }

    // Execute a simple command to verify connectivity
    await client.db('admin').command({ ping: 1 });

    const responseTime = Date.now() - start;

    return {
      status: 'healthy',
      message: 'Database is responding',
      responseTime,
      latency: responseTime > 100 ? 'slow' : responseTime > 50 ? 'moderate' : 'fast'
    };
  } catch (error) {
    logger.error('Health check - Database error:', { error: error.message });
    return {
      status: 'unhealthy',
      message: error.message,
      responseTime: Date.now() - start
    };
  }
};

/**
 * Check cache/Redis connectivity (if configured)
 */
const checkCache = async () => {
  const start = Date.now();
  try {
    // Check if NodeCache is being used
    const cacheManager = await import('../utils/cacheManager.js').catch(() => null);

    if (!cacheManager || !cacheManager.default) {
      return {
        status: 'not_configured',
        message: 'Cache manager not configured',
        responseTime: Date.now() - start
      };
    }

    const cache = cacheManager.default;

    // Try a simple cache operation
    const testKey = '_health_check_test';
    cache.set(testKey, 'test', 5);
    const value = cache.get(testKey);
    cache.del(testKey);

    if (value !== 'test') {
      throw new Error('Cache read/write test failed');
    }

    const stats = cache.getStats();
    const hitRate = stats.hits / (stats.hits + stats.misses) * 100;

    return {
      status: 'healthy',
      message: 'Cache is responding',
      responseTime: Date.now() - start,
      stats: {
        keys: cache.keys.length,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: Math.round(hitRate * 100) / 100
      }
    };
  } catch (error) {
    logger.error('Health check - Cache error:', { error: error.message });
    return {
      status: 'unhealthy',
      message: error.message,
      responseTime: Date.now() - start
    };
  }
};

/**
 * Check external services (Clerk authentication)
 */
const checkExternalServices = async () => {
  const start = Date.now();
  const results = {};

  // Check Clerk authentication
  try {
    if (process.env.CLERK_SECRET_KEY) {
      // Try to verify Clerk is available by making a simple API call
      const response = await fetch('https://api.clerk.com/v1/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }).catch(() => null);

      results.clerk = {
        status: response && response.ok ? 'healthy' : 'unhealthy',
        message: response && response.ok ? 'Clerk API is accessible' : 'Clerk API is not responding',
        responseTime: Date.now() - start
      };
    } else {
      results.clerk = {
        status: 'not_configured',
        message: 'Clerk not configured'
      };
    }
  } catch (error) {
    results.clerk = {
      status: 'unhealthy',
      message: error.message,
      responseTime: Date.now() - start
    };
  }

  // Overall status
  const overallStatus = Object.values(results).every(r => r.status === 'healthy' || r.status === 'not_configured')
    ? 'healthy'
    : Object.values(results).some(r => r.status === 'unhealthy')
    ? 'degraded'
    : 'healthy';

  return {
    status: overallStatus,
    services: results,
    responseTime: Date.now() - start
  };
};

/**
 * Get application information
 */
const getAppInfo = () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );

  return {
    name: packageJson.name || 'manageRTC',
    version: packageJson.version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
  };
};

/**
 * Basic health check endpoint (fast, no dependencies)
 */
export const basicHealthCheck = async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};

/**
 * Comprehensive health check endpoint
 */
export const detailedHealthCheck = async (req, res) => {
  const startTime = Date.now();

  try {
    // Run all health checks in parallel
    const [dbHealth, cacheHealth, externalHealth] = await Promise.allSettled([
      checkDatabase(),
      checkCache(),
      checkExternalServices()
    ]);

    const systemHealth = getSystemHealth();
    const appInfo = getAppInfo();

    // Extract results
    const database = dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'error', message: dbHealth.reason?.message || 'Unknown error' };
    const cache = cacheHealth.status === 'fulfilled' ? cacheHealth.value : { status: 'error', message: cacheHealth.reason?.message || 'Unknown error' };
    const externalServices = externalHealth.status === 'fulfilled' ? externalHealth.value : { status: 'error', message: externalHealth.reason?.message || 'Unknown error' };

    // Determine overall health status
    const checks = [
      database.status,
      cache.status === 'not_configured' ? 'healthy' : cache.status,
      externalServices.status
    ];

    let overallStatus = 'healthy';
    if (checks.some(c => c === 'unhealthy' || c === 'error')) {
      overallStatus = 'unhealthy';
    } else if (checks.some(c => c === 'warning' || c === 'degraded')) {
      overallStatus = 'degraded';
    }

    const responseTime = Date.now() - startTime;

    // Return response with appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      application: appInfo,
      system: systemHealth,
      checks: {
        database,
        cache,
        externalServices
      }
    });
  } catch (error) {
    logger.error('Health check failed:', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

/**
 * Readiness probe - checks if application is ready to serve traffic
 */
export const readinessCheck = async (req, res) => {
  try {
    // For readiness, we only check critical services
    const dbHealth = await checkDatabase();

    if (dbHealth.status !== 'healthy') {
      return res.status(503).json({
        status: 'not_ready',
        message: 'Application is not ready to serve traffic',
        checks: { database: dbHealth }
      });
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      message: error.message
    });
  }
};

/**
 * Liveness probe - checks if application is alive
 */
export const livenessCheck = async (req, res) => {
  // For liveness, we just need to confirm the process is running
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

export default {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck
};
