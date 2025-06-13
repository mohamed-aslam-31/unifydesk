import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { signupSchema, adminRoleSchema, employeeRoleSchema, shopkeeperRoleSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Validation endpoint
  app.post("/api/validate", async (req, res) => {
    try {
      const { field, value } = req.body;
      
      if (field === "username") {
        const isAvailable = await storage.isUsernameAvailable(value);
        res.json({ available: isAvailable });
      } else if (field === "email") {
        const isAvailable = await storage.isEmailAvailable(value);
        res.json({ available: isAvailable });
      } else {
        res.status(400).json({ message: "Invalid field" });
      }
    } catch (error) {
      console.error("Validation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get countries/states/cities from external API
  app.get("/api/locations/countries", async (req, res) => {
    try {
      const response = await fetch("https://countriesnow.space/api/v0.1/countries");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Countries API error:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  app.post("/api/locations/states", async (req, res) => {
    try {
      const { country } = req.body;
      const response = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("States API error:", error);
      res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  app.post("/api/locations/cities", async (req, res) => {
    try {
      const { country, state } = req.body;
      const response = await fetch("https://countriesnow.space/api/v0.1/countries/state-cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, state }),
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Cities API error:", error);
      res.status(500).json({ message: "Failed to fetch cities" });
    }
  });

  // OTP verification endpoints
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { identifier, type } = req.body; // identifier = email or phone, type = 'email' or 'phone'
      
      // Check rate limiting
      const attempts = await storage.getOtpAttempts(identifier, type);
      if (attempts && attempts.blockedUntil && attempts.blockedUntil > new Date()) {
        return res.status(429).json({ 
          message: "Too many attempts. Please try again later.",
          blockedUntil: attempts.blockedUntil 
        });
      }

      if (attempts && attempts.attempts >= 5) {
        const blockedUntil = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours
        await storage.createOrUpdateOtpAttempts({
          identifier,
          type,
          attempts: attempts.attempts,
          lastAttempt: new Date(),
          blockedUntil,
        });
        return res.status(429).json({ 
          message: "Maximum attempts exceeded. Blocked for 5 hours.",
          blockedUntil 
        });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Update attempts
      await storage.createOrUpdateOtpAttempts({
        identifier,
        type,
        attempts: (attempts?.attempts || 0) + 1,
        lastAttempt: new Date(),
        blockedUntil: null,
      });

      // TODO: Send actual OTP via email/SMS
      console.log(`OTP for ${identifier}: ${otp}`);
      
      res.json({ message: "OTP sent successfully", remainingAttempts: 5 - ((attempts?.attempts || 0) + 1) });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { identifier, type, otp } = req.body;
      
      // TODO: Verify actual OTP
      // For demo, accept any 6-digit OTP
      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: "Invalid OTP format" });
      }

      res.json({ message: "OTP verified successfully" });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // Signup endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Create user
      const user = await storage.createUser({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        username: validatedData.username,
        email: validatedData.email,
        phone: validatedData.phone,
        countryCode: validatedData.countryCode,
        isWhatsApp: validatedData.isWhatsApp,
        gender: validatedData.gender,
        dateOfBirth: validatedData.dateOfBirth,
        country: validatedData.country,
        state: validatedData.state,
        city: validatedData.city,
        address: validatedData.address,
        password: validatedData.password, // TODO: Hash password
        firebaseUid: null,
        role: null,
        profilePicture: null,
      });

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.createSession({
        userId: user.id,
        sessionToken,
        expiresAt,
      });

      res.json({ 
        message: "User created successfully", 
        sessionToken,
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Role data endpoints
  app.post("/api/roles/admin", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace("Bearer ", "");
      if (!sessionToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getSession(sessionToken);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const validatedData = adminRoleSchema.parse(req.body);
      
      // Update user role
      await storage.updateUser(session.userId, { role: "admin" });
      
      // Save role-specific data
      await storage.createRoleData({
        userId: session.userId,
        role: "admin",
        data: validatedData,
      });

      // TODO: Send approval email

      res.json({ message: "Admin registration submitted for approval" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Admin role error:", error);
      res.status(500).json({ message: "Failed to process admin registration" });
    }
  });

  app.post("/api/roles/employee", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace("Bearer ", "");
      if (!sessionToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getSession(sessionToken);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const validatedData = employeeRoleSchema.parse(req.body);
      
      await storage.updateUser(session.userId, { role: "employee" });
      
      await storage.createRoleData({
        userId: session.userId,
        role: "employee",
        data: validatedData,
      });

      res.json({ message: "Employee registration submitted for approval" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Employee role error:", error);
      res.status(500).json({ message: "Failed to process employee registration" });
    }
  });

  app.post("/api/roles/shopkeeper", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace("Bearer ", "");
      if (!sessionToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getSession(sessionToken);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const validatedData = shopkeeperRoleSchema.parse(req.body);
      
      await storage.updateUser(session.userId, { role: "shopkeeper" });
      
      await storage.createRoleData({
        userId: session.userId,
        role: "shopkeeper",
        data: validatedData,
      });

      res.json({ message: "Shop keeper registration submitted for approval" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Shopkeeper role error:", error);
      res.status(500).json({ message: "Failed to process shopkeeper registration" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace("Bearer ", "");
      if (!sessionToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getSession(sessionToken);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: { 
        id: user.id, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email, 
        role: user.role,
        roleStatus: user.roleStatus 
      }});
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
