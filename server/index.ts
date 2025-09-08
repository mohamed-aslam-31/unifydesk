import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Auto-setup database if needed
  const { setupDatabase } = await import("./auto-setup.js");
  const dbSetup = await setupDatabase();
  
  if (!dbSetup.success) {
    console.log(dbSetup.message);
  }

  // Try to connect to PostgreSQL, then Replit Database, fallback to in-memory storage
  if (process.env.DATABASE_URL) {
    try {
      console.log("Initializing PostgreSQL storage...");
      // Import and test PostgreSQL storage
      const { storage } = await import("./storage-pg.js");
      await storage.getUser(1); // Test connection
      console.log("PostgreSQL storage initialized successfully");
    } catch (error) {
      console.log("PostgreSQL storage failed, trying Replit Database...");
      console.log("Database connection error:", error instanceof Error ? error.message : String(error));
      
      try {
        // Import and test Replit Database storage
        const { storage } = await import("./storage-replit.js");
        await storage.getUser(1); // Test connection
        console.log("Connected to Replit Database successfully");
      } catch (replitError) {
        console.log("Replit Database connection failed, using in-memory storage");
        console.log("Replit Database error:", replitError instanceof Error ? replitError.message : String(replitError));
      }
    }
  } else {
    try {
      console.log("No PostgreSQL URL found, trying Replit Database...");
      // Import and test Replit Database storage
      const { storage } = await import("./storage-replit.js");
      await storage.getUser(1); // Test connection
      console.log("Connected to Replit Database successfully");
    } catch (replitError) {
      console.log("Replit Database connection failed, using in-memory storage");
      console.log("Replit Database error:", replitError instanceof Error ? replitError.message : String(replitError));
    }
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please close any existing servers and try again.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      throw err;
    }
  });
  
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
