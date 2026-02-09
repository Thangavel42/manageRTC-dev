import { config } from 'dotenv';
config();

import { clerkClient } from '@clerk/clerk-sdk-node';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { startPromotionScheduler } from './jobs/promotionScheduler.js';
import companiesRoutes from './routes/companies.routes.js';
import contactRoutes from './routes/contacts.routes.js';
import dealRoutes from './routes/deal.routes.js';
import goalTrackingRoutes from './routes/performance/goalTracking.routes.js';
import goalTypeRoutes from './routes/performance/goalType.routes.js';
import socialFeedRoutes from './routes/socialfeed.routes.js';
import ticketRoutes from './routes/tickets.routes.js';
import { socketHandler } from './socket/index.js';

// Swagger/OpenAPI Documentation
import { specs, swaggerUi } from './config/swagger.js';

import performanceAppraisalRoutes from './routes/performance/performanceAppraisal.routes.js';
import performanceIndicatorRoutes from './routes/performance/performanceIndicator.routes.js';
import performanceReviewRoutes from './routes/performance/performanceReview.routes.js';

// REST API Routes (Socket.IO to REST Migration)
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import activityRoutes from "./routes/api/activities.js";
import adminDashboardRoutes from "./routes/api/admin-dashboard.js";
import assetRoutes from "./routes/api/assets.js";
import attendanceRoutes from "./routes/api/attendance.js";
import clientRoutes from "./routes/api/clients.js";
import departmentRoutes from "./routes/api/departments.js";
import designationRoutes from "./routes/api/designations.js";
import employeeRoutes from "./routes/api/employees.js";
import holidayTypeRoutes from "./routes/api/holiday-types.js";
import holidayRoutes from "./routes/api/holidays.js";
import hrDashboardRoutes from "./routes/api/hr-dashboard.js";
import leadRoutes from "./routes/api/leads.js";
import leaveRoutes from "./routes/api/leave.js";
import leaveTypeRoutes from "./routes/api/leaveTypes.js";
import pipelineRoutes from "./routes/api/pipelines.js";
import policyRoutes from "./routes/api/policies.js";
import projectRoutes from "./routes/api/projects.js";
import promotionRoutes from "./routes/api/promotions.js";
import resignationRoutes from "./routes/api/resignations.js";
import shiftRoutes from "./routes/api/shifts.js";
import taskRoutes from "./routes/api/tasks.js";
import terminationRoutes from "./routes/api/terminations.js";
import trainingRoutes from "./routes/api/training.js";
import timetrackingRoutes from "./routes/api/timetracking.js";
import overtimeRoutes from "./routes/api/overtime.js";
import userProfileRoutes from "./routes/api/user-profile.js";
import clerkWebhookRoutes from "./routes/webhooks/clerk.routes.js";
import scheduleRoutes from "./routes/api/schedule.js";
import batchRoutes from "./routes/api/batches.js";
import healthRoutes from "./routes/health.js";
import syncRoleRoutes from "./routes/api/syncRole.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dev.manage-rtc.com',
  'https://apidev.manage-rtc.com',
  process.env.FRONTEND_URL,
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

app.use(express.json());

// Note: We use manual token verification in the authenticate middleware
// No need for clerkMiddleware() since we use verifyToken() directly

console.log('[Deployment]: TEST TEST');

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve export files specifically
app.use('/exports', express.static(path.join(__dirname, 'public', 'exports')));

// Serve employee profile images with caching headers
app.use('/uploads/employee-images', express.static(path.join(__dirname, 'public', 'uploads', 'employee-images'), {
  setHeaders: (res, filepath) => {
    // Set cache headers for images (1 day)
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

// Serve leave attachments with security headers
app.use('/uploads/leave-attachments', express.static(path.join(__dirname, 'public', 'uploads', 'leave-attachments'), {
  setHeaders: (res, filepath) => {
    // No cache for attachments (security)
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

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
    console.log('Database connection established successfully');

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
    app.use("/api/employees", employeeRoutes);
    app.use("/api/projects", projectRoutes);
    app.use("/api/tasks", taskRoutes);
    app.use("/api/leads", leadRoutes);
    app.use("/api/clients", clientRoutes);
    app.use("/api/attendance", attendanceRoutes);
    app.use("/api/leaves", leaveRoutes);
    app.use("/api/leave-types", leaveTypeRoutes);
    app.use("/api/assets", assetRoutes);
    app.use("/api/trainings", trainingRoutes);
    app.use("/api/activities", activityRoutes);
    app.use("/api/pipelines", pipelineRoutes);
    app.use("/api/holiday-types", holidayTypeRoutes);
    app.use("/api/promotions", promotionRoutes);
    app.use("/api/departments", departmentRoutes);
    app.use("/api/policies", policyRoutes);
    app.use("/api/designations", designationRoutes);
    app.use("/api/resignations", resignationRoutes);
    app.use("/api/shifts", shiftRoutes);
    app.use("/api/batches", batchRoutes);
    app.use("/api/terminations", terminationRoutes);
    app.use("/api/holidays", holidayRoutes);
    app.use("/api/hr-dashboard", hrDashboardRoutes);
    app.use("/api/admin-dashboard", adminDashboardRoutes);
    app.use("/api/user-profile", userProfileRoutes);
    app.use("/api/timetracking", timetrackingRoutes);
    app.use("/api/overtime", overtimeRoutes);
    app.use("/api/schedule", scheduleRoutes);
    app.use("/api/sync-role", syncRoleRoutes);

    // Clerk Webhooks
    app.use("/api/webhooks", clerkWebhookRoutes);

    // Health Check Routes
    app.use("/health", healthRoutes);

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
        console.log(userId, companyId, role);

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        const updatedUser = await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            companyId,
            role,
          },
        });

        res.json({ message: 'User metadata updated', user: updatedUser });
      } catch (error) {
        console.error('Error updating user:', error);
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
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
      }
    });

    // Error handling (must be after all routes)
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Socket setup - attach io to app for REST broadcasters
    const io = socketHandler(httpServer);
    app.set('io', io);

    // Start promotion scheduler for automatic promotion application
    try {
      await startPromotionScheduler();
      console.log('✅ Promotion scheduler initialized');
    } catch (err) {
      console.error('⚠️  Promotion scheduler failed to initialize:', err.message);
      // Continue server startup even if scheduler fails
    }

    // Server listen
    console.log('📡 About to start HTTP server...');
    const PORT = process.env.PORT || 5000;
    console.log(`📡 Starting server on port ${PORT}...`);

    httpServer.listen(PORT, (err) => {
      if (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
      }
      console.log(`🚀 Server running on port ${PORT}`);
      // console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Environment: Development`);
    });

    // Handle server errors
    httpServer.on('error', (err) => {
      console.error('❌ Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

initializeServer();
