import { clerkClient, verifyToken } from "@clerk/express";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import router from "./router.js";
dotenv.config();

// Environment detection for logging purposes
const isDevelopment = process.env.NODE_ENV === "development" || process.env.DEV_MODE === "true";

// Rate limiting configuration

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per minute per user

const checkRateLimit = (userId) => {
  // SECURITY FIX: Rate limiting is now ENABLED in all environments
  // Development mode users must respect rate limits to prevent abuse
  // Adjust RATE_LIMIT_MAX_REQUESTS in .env for different environments if needed

  const now = Date.now();
  const userKey = `user:${userId}`;

  if (!rateLimitMap.has(userKey)) {
    rateLimitMap.set(userKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  const userLimit = rateLimitMap.get(userKey);

  if (now > userLimit.resetTime) {
    // Reset the rate limit window
    rateLimitMap.set(userKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`⚠️ Rate limit exceeded for user ${userId}`);
    return false;
  }

  userLimit.count++;
  return true;
};

// Clean up old rate limit entries (runs in all environments)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://amasqis.ai",
  "https://devhrms-pm.amasqis.ai",
  "http://byte.localhost:3000",
  "http://test.localhost:3000",
  "http://dummy.localhost:3000",
  "https://hrms-tool-amasqis.onrender.com",
  "https://devmanagertc.amasqis.ai",
  "https://dev.manage-rtc.com",
  "https://apidev.manage-rtc.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

const authorizedParties = [
  "https://devhrms-pm.amasqis.ai/",
  "http://localhost:3000",
  "http://185.199.53.177:5000/",
  "http://byte.localhost:3000",
  "http://test.localhost:3000",
  "http://dummy.localhost:3000",
  "https://devhrms-pm.amasqis.ai",
  "https://devmanagertc.amasqis.ai",
  "https://dev.manage-rtc.com",
  "https://apidev.manage-rtc.com",
];

export const socketHandler = (httpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    console.log("Socket connection attempt...");
    const token = socket.handshake.auth.token;
    console.log("Token received:", token ? "Token present" : "No token");
    if (!token) {
      console.error("No token provided");
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const verifiedToken = await verifyToken(token, {
        jwtKey: process.env.CLERK_JWT_KEY,
        authorizedParties,
      });

      if (verifiedToken) {
        console.log(`Token verified! User ID: ${verifiedToken.sub}`);
        socket.user = verifiedToken;

        let user;
        try {
          user = await clerkClient.users.getUser(verifiedToken.sub);
        } catch (clerkError) {
          console.error(`Failed to fetch user from Clerk:`, clerkError.message);
          console.error(`Clerk error details:`, {
            userId: verifiedToken.sub,
            error: clerkError,
          });
          return next(
            new Error("Authentication error: Failed to fetch user data")
          );
        }

        // Store user metadata on socket for security checks
        socket.userMetadata = user.publicMetadata;

        // DEBUG: Log full user data to understand what's available
        console.log(`[DEBUG] Clerk User Data for ${user.id}:`, {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          fullName: user.fullName,
          primaryEmailAddress: user.primaryEmailAddress?.emailAddress,
          emailAddresses: user.emailAddresses?.map(e => e.emailAddress),
          primaryPhoneNumber: user.primaryPhoneNumber?.phoneNumber,
          phoneNumbers: user.phoneNumbers?.map(p => p.phoneNumber),
          imageUrl: user.imageUrl,
          publicMetadata: user.publicMetadata,
          unsafeMetadata: user.unsafeMetadata,
          privateMetadata: user.privateMetadata,
        });

        // Check if role exists, else assign default role based on metadata
        // Normalize role to lowercase for consistent case-insensitive comparisons
        let role = (user.publicMetadata?.role || 'public')?.toLowerCase();
        // Check for both 'companyId' and 'company' field names in metadata
        let companyId = user.publicMetadata?.companyId || user.publicMetadata?.company || null;

        // SECURITY FIX REMOVED: Hardcoded companyId assignment has been removed
        // All users must have a valid companyId in their Clerk metadata
        // This prevents cross-tenant data access in both development and production
        if (!companyId && (role === "admin" || role === "hr" || role === "employee")) {
          console.error(
            `❌ SECURITY: User ${user.id} with role '${role}' missing required companyId`
          );
          return next(
            new Error("Authentication error: Company ID required for this role")
          );
        }

        console.log(`User ${user.id} metadata:`, {
          role: role,
          companyId: companyId,
          hasVerification: !!user.publicMetadata?.isAdminVerified,
          environment: isDevelopment ? "development" : "production",
          publicMetadata: user.publicMetadata,
        });

        if (!role) {
          // SECURITY FIX: Never auto-assign admin role, even in development
          // Users without a role must be explicitly configured in Clerk
          if (companyId && user.publicMetadata?.isVerified) {
            role = "employee"; // Only assign employee if verified
            console.log(`User ${user.id} assigned default role: ${role}`);
          } else {
            role = "public"; // Public users have no company access
            console.log(`User ${user.id} has no role/verification, setting as: ${role}`);
          }

          // Log for security auditing
          console.warn(
            `⚠️ User ${user.id} had no role assigned, defaulting to: ${role}`
          );

          // Update metadata with the assigned role
          await clerkClient.users.updateUserMetadata(user.id, {
            publicMetadata: { ...user.publicMetadata, role, companyId },
          });
        } else {
          console.log(`User ${user.id} has existing role: ${role}`);
        }

        // SECURITY CHECK: Verify admin role is legitimate
        // Admin access requires both companyId and verification flag in all environments
        if (role === "admin") {
          console.log(`Checking admin access for user ${user.id}...`);

          // All environments require the same security for admin access
          if (!companyId || !user.publicMetadata?.isAdminVerified) {
            console.error(
              `❌ SECURITY: Unauthorized admin access attempt by user ${user.id}`
            );
            console.error(`Missing: ${!companyId ? 'companyId ' : ''}${!user.publicMetadata?.isAdminVerified ? 'isAdminVerified flag' : ''}`);
            return next(
              new Error("Unauthorized: Admin access requires companyId and verification")
            );
          }
          console.log(
            `✅ Verified admin access for user ${user.id} with companyId: ${companyId}`
          );
        }

        // Store user ID for easy access & Mark socket as authenticated
        socket.userId = verifiedToken.sub;
        socket.role = role;
        socket.companyId = companyId;
        socket.authenticated = true;
        // Store full user object for profile operations
        socket.clerkUser = user;

        console.log(
          `Socket authentication complete for user: ${verifiedToken.sub}, role: ${role}, company: ${companyId}`
        );

        // SECURITY: Add rate limiting function to socket
        socket.checkRateLimit = () => checkRateLimit(socket.userId);

        console.log(`Company ID: ${companyId || "None"}`);

        // Join role-based rooms
        switch (role) {
          case "superadmin":
            socket.join("superadmin_room");
            console.log(`User joined superadmin_room`);
            break;
          case "admin":
            if (companyId) {
              socket.join(`admin_room_${companyId}`);
              socket.join(`company_${companyId}`);
              socket.join(`user_${user.id}`);
              console.log(`User joined admin_room_${companyId}`);
            } else {
              console.warn(`Admin user ${user.id} has no companyId`);
              return next(new Error("Admin user must have a companyId"));
            }
            break;
          case "hr":
            if (companyId) {
              socket.join(`hr_room_${companyId}`);
              socket.join(`company_${companyId}`);
              socket.join(`user_${user.id}`);
              console.log(`User joined hr_room_${companyId}`);
            }
            break;
          case "employee":
            if (companyId) {
              socket.join(`employee_room_${companyId}`);
              socket.join(`company_${companyId}`);
              socket.join(`user_${user.id}`);
              console.log(`User joined employee_room_${companyId}`);
            }
            break;
          default:
            console.log(`User with role '${role}' connected`);
            break;
        }

        return next();
      } else {
        console.error("Invalid token");
        return next(new Error("Authentication error: Invalid token"));
      }
    } catch (err) {
      // Check if the error is due to token expiration (normal occurrence)
      if (err.message && (err.message.includes('expired') || err.message.includes('JWT is expired'))) {
        console.warn("[Socket Auth] Token expired (normal) - client should refresh:", {
          error: err.message,
          socketId: socket.id
        });
        return next(new Error("Authentication error: Token expired - please refresh"));
      }

      // Other authentication errors (actual problems)
      console.error("[Socket Auth] Token verification failed:", {
        error: err.message,
        socketId: socket.id
      });
      return next(new Error("Authentication error: Token verification failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `Client connected: ${socket.id}, Role: ${socket.role}, Company: ${
        socket.companyId || "None"
      }, UserId: ${socket.userId || "None"}`
    );
    console.log(`Socket user metadata:`, socket.userMetadata);
    console.log(`Socket user object:`, socket.user);
    const role = socket.role || "guest";
    router(socket, io, role);

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Return io instance so it can be attached to Express app for REST broadcasters
  return io;
};
