import 'dotenv/config';

import { clerkClient } from '@clerk/clerk-sdk-node';
import compression from 'compression';
import cookieParser from 'cookie-parser'; // ✅ SECURITY FIX - Phase 2: CSRF protection
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet'; // ✅ SECURITY FIX - Phase 6: Security headers
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { startPromotionScheduler } from './jobs/promotionScheduler.js';
import { startResignationScheduler } from './jobs/resignationScheduler.js';
import { attachRequestId } from './middleware/auth.js';
import { conditionalCsrf, csrfErrorHandler } from './middleware/csrf.js'; // ✅ SECURITY FIX - Phase 2
import { apiLimiter } from './middleware/rateLimiting.js'; // ✅ SECURITY FIX - Phase 2
import companiesRoutes from './routes/companies.routes.js';
import contactRoutes from './routes/contacts.routes.js';
import dealRoutes from './routes/deal.routes.js';
import goalTrackingRoutes from './routes/performance/goalTracking.routes.js';
import goalTypeRoutes from './routes/performance/goalType.routes.js';
import socialFeedRoutes from './routes/socialfeed.routes.js';
import ticketRoutes from './routes/tickets.routes.js';
import { seedTicketCategories } from './seed/ticketCategories.seed.js';
import { socketHandler } from './socket/index.js';
import logger from './utils/logger.js'; // ✅ SECURITY FIX - Phase 6: Structured logging

// Swagger/OpenAPI Documentation
import { specs, swaggerUi } from './config/swagger.js';

import performanceAppraisalRoutes from './routes/performance/performanceAppraisal.routes.js';
import performanceIndicatorRoutes from './routes/performance/performanceIndicator.routes.js';
import performanceReviewRoutes from './routes/performance/performanceReview.routes.js';

// REST API Routes (Socket.IO to REST Migration)
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import activityRoutes from './routes/api/activities.js';
import adminDashboardRoutes from './routes/api/admin-dashboard.js';
import assetCategoryRoutes from './routes/api/asset-categories.js';
import assetRoutes from './routes/api/assets.js';
import assetUserRoutes from './routes/api/assetUsers.js';
import attendanceRoutes from './routes/api/attendance.js';
import auditRoutes from './routes/api/audit.js';
import batchRoutes from './routes/api/batches.js';
import candidatesRoutes from './routes/api/candidates.js';
import changeRequestRoutes from './routes/api/changeRequest.js';
import clientRoutes from './routes/api/clients.js';
import csrfRoutes from './routes/api/csrf.js'; // ✅ SECURITY FIX - Phase 2: CSRF token endpoint
import departmentRoutes from './routes/api/departments.js';
import designationRoutes from './routes/api/designations.js';
import emailChangeRoutes from './routes/api/emailChange.routes.js';
import employeeDashboardRoutes from './routes/api/employee-dashboard.js';
import employeeRoutes from './routes/api/employees.js';
import holidayTypeRoutes from './routes/api/holiday-types.js';
import holidayRoutes from './routes/api/holidays.js';
import hrDashboardRoutes from './routes/api/hr-dashboard.js';
import leadRoutes from './routes/api/leads.js';
import leaveRoutes from './routes/api/leave.js';
import leaveTypeRoutes from './routes/api/leaveTypes.js';
import overtimeRoutes from './routes/api/overtime.js';
import pipelineRoutes from './routes/api/pipelines.js';
import policyRoutes from './routes/api/policies.js';
import projectContractRoutes from './routes/api/projectcontracts.js';
import projectRoutes from './routes/api/projects.js';
import promotionRoutes from './routes/api/promotions.js';
import resignationRoutes from './routes/api/resignations.js';
import scheduleRoutes from './routes/api/schedule.js';
import shiftRoutes from './routes/api/shifts.js';
import subcontractRoutes from './routes/api/subcontracts.js';
import syncRoleRoutes from './routes/api/syncRole.routes.js';
import taskRoutes from './routes/api/tasks.js';
import terminationRoutes from './routes/api/terminations.js';
import timesheetRoutes from './routes/api/timesheets.js';
import timetrackingRoutes from './routes/api/timetracking.js';
import trainingRoutes from './routes/api/training.js';
import userProfileRoutes from './routes/api/user-profile.js';
import healthRoutes from './routes/health.js';
import clerkWebhookRoutes from './routes/webhooks/clerk.routes.js';

// RBAC Routes
import adminUsersRoutes from './routes/api/admin.users.js';
import companyChangeRequestRoutes from './routes/api/companyChangeRequest.js';
import companyPagesRoutes from './routes/api/companyPages.routes.js';
import rbacModulesRoutes from './routes/api/rbac/modules.js';
import rbacPageCategoriesRoutes from './routes/api/rbac/pageCategories.routes.js';
import rbacPagesRoutes from './routes/api/rbac/pages.js';
import rbacPagesHierarchyRoutes from './routes/api/rbac/pagesHierarchy.js';
import rbacPermissionsRoutes from './routes/api/rbac/permissions.js';
import rbacRolesRoutes from './routes/api/rbac/roles.js';
import superadminCompaniesRoutes from './routes/api/superadmin.companies.js';
import superadminRoutes from './routes/api/superadmin.routes.js';
import debugRoutes from './routes/debug/auth-debug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS configuration — set EXTRA_ALLOWED_ORIGINS in .env as comma-separated list for additional origins
const extraOrigins = process.env.EXTRA_ALLOWED_ORIGINS
  ? process.env.EXTRA_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  ...extraOrigins,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ✅ SECURITY FIX - Phase 6: Security headers via helmet
app.use(helmet({
  contentSecurityPolicy: false,           // CSP handled separately to avoid breaking frontend
  crossOriginEmbedderPolicy: false,       // Allow cross-origin images (Cloudinary, Clerk)
  crossOriginResourcePolicy: false,       // Allow cross-origin resource loading
}));

// Compress all responses
app.use(compression());

// Parse JSON bodies with increased limit for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ SECURITY FIX - Phase 2: Cookie parser (required for CSRF protection)
app.use(cookieParser());

// Attach unique request ID to all requests for tracing
app.use(attachRequestId);

// Note: We use manual token verification in the authenticate middleware
// No need for clerkMiddleware() since we use verifyToken() directly

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve export files specifically
app.use('/exports', express.static(path.join(__dirname, 'public', 'exports')));

// Serve employee profile images with caching headers
app.use(
  '/uploads/employee-images',
  express.static(path.join(__dirname, 'public', 'uploads', 'employee-images'), {
    setHeaders: (res, filepath) => {
      // Set cache headers for images (1 day)
      res.set('Cache-Control', 'public, max-age=86400, immutable');
      res.set('X-Content-Type-Options', 'nosniff');
    },
  })
);

// Serve leave attachments with security headers
app.use(
  '/uploads/leave-attachments',
  express.static(path.join(__dirname, 'public', 'uploads', 'leave-attachments'), {
    setHeaders: (res, filepath) => {
      // No cache for attachments (security)
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('X-Content-Type-Options', 'nosniff');
    },
  })
);

// Serve static files from the temp directory
app.use(
  '/temp',
  express.static(path.join(__dirname, 'temp'), {
    setHeaders: (res, path) => {
      // Set appropriate headers based on file type
      if (path.endsWith('.pdf')) {
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment');
      } else if (path.endsWith('.xlsx')) {
        res.set(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.set('Content-Disposition', 'attachment');
      }
      // Security headers
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    },
  })
);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Initialize Server
const initializeServer = async () => {
  try {
    await connectDB();
    logger.info('Database connection established successfully');

    // ✅ SECURITY FIX - Phase 2: Apply global rate limiting to all API routes
    // This prevents DoS attacks and API abuse
    // Individual routes can have stricter limits on top of this
    app.use('/api/', apiLimiter);  // 100 requests per minute per user/IP

    // ✅ SECURITY FIX - Phase 2: Apply CSRF protection to state-changing requests
    // Skips GET/HEAD/OPTIONS and webhook endpoints
    // Can be disabled in development with DISABLE_CSRF=true in .env
    app.use('/api/', conditionalCsrf);

    // CSRF Token Endpoint (must be before other routes to work)
    app.use('/api', csrfRoutes);

    // Seed ticket categories into superadmin DB (only if not already present)
    try {
      await seedTicketCategories();
    } catch (err) {
      console.error('⚠️  Ticket categories seed failed:', err.message);
    }

    // Routes
    app.use('/api/socialfeed', socialFeedRoutes);
    app.use('/api/deals', dealRoutes);
    app.use('/api/companies', companiesRoutes);
    app.use('/api/contacts', contactRoutes);
    app.use('/api/performance/goal-types', goalTypeRoutes);
    app.use('/api/performance/goal-trackings', goalTrackingRoutes);
    app.use('/api/tickets', ticketRoutes);

    app.use('/api/performance/indicators', performanceIndicatorRoutes);
    app.use('/api/performance/appraisals', performanceAppraisalRoutes);
    app.use('/api/performance/reviews', performanceReviewRoutes);

    // REST API Routes (Socket.IO to REST Migration)
    app.use('/api/employees', employeeRoutes);
    app.use('/api/employees', emailChangeRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/projectcontracts', projectContractRoutes);
    app.use('/api/subcontracts', subcontractRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/leads', leadRoutes);
    app.use('/api/clients', clientRoutes);
    app.use('/api/attendance', attendanceRoutes);
    app.use('/api/employee/dashboard', employeeDashboardRoutes);
    app.use('/api/leaves', leaveRoutes);
    app.use('/api/leave-types', leaveTypeRoutes);
    app.use('/api/assets', assetRoutes);
    app.use('/api/asset-categories', assetCategoryRoutes);
    app.use('/api/asset-users', assetUserRoutes);
    app.use('/api/trainings', trainingRoutes);
    app.use('/api/activities', activityRoutes);
    app.use('/api/pipelines', pipelineRoutes);
    app.use('/api/holiday-types', holidayTypeRoutes);
    app.use('/api/promotions', promotionRoutes);
    app.use('/api/departments', departmentRoutes);
    app.use('/api/policies', policyRoutes);
    app.use('/api/designations', designationRoutes);
    app.use('/api/resignations', resignationRoutes);
    app.use('/api/shifts', shiftRoutes);
    app.use('/api/batches', batchRoutes);
    app.use('/api/candidates', candidatesRoutes);
    app.use('/api/terminations', terminationRoutes);
    app.use('/api/holidays', holidayRoutes);
    app.use('/api/hr-dashboard', hrDashboardRoutes);
    app.use('/api/admin-dashboard', adminDashboardRoutes);
    app.use('/api/user-profile', userProfileRoutes);
    app.use('/api/change-requests', changeRequestRoutes);
    app.use('/api/timetracking', timetrackingRoutes);
    app.use('/api/overtime', overtimeRoutes);
    app.use('/api/timesheets', timesheetRoutes);
    app.use('/api/schedule', scheduleRoutes);
    app.use('/api/sync-role', syncRoleRoutes);
    app.use('/api/audit', auditRoutes);

    // RBAC Routes
    app.use('/api/rbac/categories', rbacPageCategoriesRoutes);
    app.use('/api/rbac/roles', rbacRolesRoutes);
    app.use('/api/rbac/permissions', rbacPermissionsRoutes);
    app.use('/api/rbac/modules', rbacModulesRoutes);
    app.use('/api/rbac/pages', rbacPagesRoutes);
    app.use('/api/rbac/pages-hierarchy', rbacPagesHierarchyRoutes);
    app.use('/api/admin/users', adminUsersRoutes);

    // Superadmin Routes
    app.use('/api/superadmin', superadminCompaniesRoutes);
    app.use('/api/superadmin/users', superadminRoutes);

    // Company Change Request Routes (Admin → Superadmin approval flow)
    app.use('/api/company-change-requests', companyChangeRequestRoutes);

    // Company Pages Routes (module-based sidebar filtering)
    app.use('/api/company', companyPagesRoutes);

    // Clerk Webhooks
    app.use('/api/webhooks', clerkWebhookRoutes);

    // Debug Routes (Development only)
    if (process.env.NODE_ENV !== 'production') {
      app.use('/api/debug', debugRoutes);
    }

    // Health Check Routes
    app.use('/health', healthRoutes);

    // API Documentation (Swagger)
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(specs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'manageRTC API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
        },
      })
    );

    app.get('/', (req, res) => {
      res.send('API is running');
    });

    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      });
    });

    app.post('/api/update-role', async (req, res) => {
      try {
        const { userId, companyId, role } = req.body;

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        const updatedUser = await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            companyId,
            role,
            ...(role === 'admin' ? { isAdminVerified: true } : {}),
          },
        });

        res.json({ message: 'User metadata updated', user: updatedUser });
      } catch (error) {
        logger.error('Error updating user metadata', { error: error.message });
        res.status(500).json({ error: 'Failed to update user metadata' });
      }
    });

    // Serve export files
    app.get('/exports/:filename', (req, res) => {
      try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, 'public', 'exports', filename);

        // Check if file exists
        if (fs.existsSync(filePath)) {
          // Set appropriate headers for download
          res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

          if (filename.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
          } else if (filename.endsWith('.csv')) {
            res.setHeader('Content-Type', 'text/csv');
          }

          // Stream the file
          const fileStream = fs.createReadStream(filePath);
          fileStream.pipe(res);
        } else {
          res.status(404).json({ error: 'File not found' });
        }
      } catch (error) {
        console.error('Export file download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
      }
    });

    app.get('/download-export/:filename', (req, res) => {
      try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, 'public', 'exports', filename);

        // Check if file exists
        if (fs.existsSync(filePath)) {
          // Set appropriate headers
          if (filename.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
          } else if (filename.endsWith('.csv')) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
          }

          // Stream the file
          const fileStream = fs.createReadStream(filePath);
          fileStream.pipe(res);
        } else {
          res.status(404).json({ error: 'File not found' });
        }
      } catch (error) {
        logger.error('Download error', { error: error.message });
        res.status(500).json({ error: 'Failed to download file' });
      }
    });

    // Error handling (must be after all routes)
    app.use(notFoundHandler);
    app.use(csrfErrorHandler);  // ✅ SECURITY FIX - Phase 2: Handle CSRF errors
    app.use(errorHandler);

    // Socket setup - attach io to app for REST broadcasters
    const io = socketHandler(httpServer);
    app.set('io', io);

    // Start promotion scheduler for automatic promotion application
    try {
      await startPromotionScheduler();
      logger.info('Promotion scheduler initialized');
    } catch (err) {
      logger.warn('Promotion scheduler failed to initialize', { error: err.message });
      // Continue server startup even if scheduler fails
    }

    // Start resignation scheduler for automatic resignation processing
    try {
      await startResignationScheduler();
      logger.info('Resignation scheduler initialized');
    } catch (err) {
      logger.warn('Resignation scheduler failed to initialize', { error: err.message });
      // Continue server startup even if scheduler fails
    }

    // Server listen
    const PORT = process.env.PORT || 5000;
    logger.info(`Starting server on port ${PORT}...`);

    httpServer.listen(PORT, (err) => {
      if (err) {
        logger.error('Failed to start server', { error: err.message });
        process.exit(1);
      }
      logger.info(`Server running on port ${PORT}`, { environment: process.env.NODE_ENV || 'development' });
    });

    // Handle server errors
    httpServer.on('error', (err) => {
      logger.error('Server error', { error: err.message, code: err.code });
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to initialize server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

initializeServer();
