import express from "express";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "dotenv";
import { connectDB } from "./config/db.js";
import { socketHandler } from "./socket/index.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { clerkClient } from "@clerk/clerk-sdk-node";
import socialFeedRoutes from "./routes/socialfeed.routes.js";
import dealRoutes from "./routes/deal.routes.js";
import companiesRoutes from "./routes/companies.routes.js";
import contactRoutes from "./routes/contacts.routes.js";
import goalTypeRoutes from "./routes/performance/goalType.routes.js";
import goalTrackingRoutes from "./routes/performance/goalTracking.routes.js";
import ticketRoutes from "./routes/tickets.routes.js";



import performanceIndicatorRoutes from "./routes/performance/performanceIndicator.routes.js";
import performanceAppraisalRoutes from "./routes/performance/performanceAppraisal.routes.js";
import performanceReviewRoutes from "./routes/performance/performanceReview.routes.js";
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

console.log("[Deployment]: TEST TEST");

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve export files specifically
app.use('/exports', express.static(path.join(__dirname, 'public', 'exports')));

// Serve static files from the temp directory
app.use(
  "/temp",
  express.static(path.join(__dirname, "temp"), {
    setHeaders: (res, path) => {
      // Set appropriate headers based on file type
      if (path.endsWith(".pdf")) {
        res.set("Content-Type", "application/pdf");
        res.set("Content-Disposition", "attachment");
      } else if (path.endsWith(".xlsx")) {
        res.set(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.set("Content-Disposition", "attachment");
      }
      // Security headers
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
    },
  })
);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Initialize Server
const initializeServer = async () => {
  try {
    await connectDB();
    console.log("Database connection established successfully");

    // Routes
    app.use("/api/socialfeed", socialFeedRoutes);
    app.use("/api/deals", dealRoutes);
    app.use("/api/companies", companiesRoutes);
    app.use("/api/contacts", contactRoutes);
    app.use("/api/performance/goal-types", goalTypeRoutes);
    app.use("/api/performance/goal-trackings", goalTrackingRoutes);
    app.use("/api/tickets", ticketRoutes);



    app.use("/api/performance/indicators", performanceIndicatorRoutes);
    app.use("/api/performance/appraisals", performanceAppraisalRoutes);
    app.use("/api/performance/reviews", performanceReviewRoutes);

    app.get("/", (req, res) => {
      res.send("API is running");
    });

    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
    });

    app.post("/api/update-role", async (req, res) => {
      try {
        const { userId, companyId, role } = req.body;
        console.log(userId, companyId, role);

        if (!userId) {
          return res.status(400).json({ error: "User ID is required" });
        }

        const updatedUser = await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            companyId,
            role,
          },
        });

        res.json({ message: "User metadata updated", user: updatedUser });
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user metadata" });
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

    // Socket setup
    socketHandler(httpServer);

    // Server listen
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("[Deployment]: Praveen Push");
      // console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Environment: Development`);
    });
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
};

initializeServer();
