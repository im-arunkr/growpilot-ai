
import express from "express";
import cors from "cors";
import { checkDatabaseConnection } from "./config/supabase.js";
import { env } from "./config/env.js";
import businessRoutes from "./routes/business.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import approvalRoutes from "./routes/approval.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
const app = express();

// Global middleware
app.use(cors({
    origin: env.NODE_ENV === "development"
        ? ["http://localhost:3000"]
        : [],
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// API Health Check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "GrowPilot AI Backend is running",
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});

// Database Connection Check
// Local development diagnostic endpoint only
if (env.NODE_ENV === "development") {
    app.get("/api/health/database", async (req, res) => {
        try {
            const database = await checkDatabaseConnection();

            return res.status(200).json({
                success: true,
                message: "Supabase connected successfully",
                database,
            });
        } catch (error) {
            console.error("Database health check failed:", error.message);

            return res.status(503).json({
                success: false,
                message: "Database connection failed",
            });
        }
    });
}

// Root API
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        application: "GrowPilot AI",
        version: "1.0.0",
    });
});
// Business APIs
app.use("/api/businesses", businessRoutes);
// Dashboard API
app.use("/api/dashboard", dashboardRoutes);
// Customer APIs
app.use("/api/customers", customerRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/approvals", approvalRoutes);
// Unknown Routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
    });
});

// Global Error Handler

app.use((err, req, res, next) => {
  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode < 600
      ? err.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error("Unhandled API error:", err);
  }

  return res.status(statusCode).json({
    success: false,
    errorCode:
      err.code || "INTERNAL_SERVER_ERROR",
    message:
      statusCode >= 500
        ? "An internal server error occurred"
        : err.message,
  });
});


export default app;
