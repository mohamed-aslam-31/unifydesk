import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { signupSchema, adminRoleSchema, employeeRoleSchema, shopkeeperRoleSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { captchaService } from "./captcha-service";
import { indianStatesAndCities } from "./indian-locations";

export async function registerRoutes(app: Express): Promise<Server> {
  // CAPTCHA generation endpoint
  app.get("/api/captcha/generate", async (req, res) => {
    try {
      const { question, answer, sessionId } = captchaService.generateCaptcha();
      
      // Store CAPTCHA in database with 10 minute expiration
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.createCaptcha({
        sessionId,
        question,
        answer,
        expiresAt,
        attempts: 0,
        solved: false
      });

      res.json({
        question,
        sessionId
      });
    } catch (error) {
      console.error("CAPTCHA generation error:", error);
      res.status(500).json({ message: "Failed to generate CAPTCHA" });
    }
  });

  // CAPTCHA verification endpoint
  app.post("/api/captcha/verify", async (req, res) => {
    try {
      const { sessionId, answer } = req.body;
      
      if (!sessionId || !answer) {
        return res.status(400).json({ message: "Session ID and answer are required" });
      }

      const isValid = await storage.verifyCaptcha(sessionId, answer);
      res.json({ valid: isValid });
    } catch (error) {
      console.error("CAPTCHA verification error:", error);
      res.status(500).json({ message: "Failed to verify CAPTCHA" });
    }
  });



  // Validation endpoint
  app.post("/api/validate", async (req, res) => {
    try {
      const { field, value, countryCode } = req.body;
      
      if (field === "username") {
        const isAvailable = await storage.isUsernameAvailable(value);
        res.json({ available: isAvailable });
      } else if (field === "email") {
        const isAvailable = await storage.isEmailAvailable(value);
        res.json({ available: isAvailable });
      } else if (field === "phone") {
        const isAvailable = await storage.isPhoneAvailable(value, countryCode);
        res.json({ available: isAvailable });
      } else {
        res.status(400).json({ message: "Invalid field" });
      }
    } catch (error) {
      console.error("Validation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get countries - fixed to India only
  app.get("/api/locations/countries", async (req, res) => {
    try {
      res.json({
        error: false,
        msg: "countries and states data retrieved",
        data: [{ country: "India" }]
      });
    } catch (error) {
      console.error("Countries API error:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  app.post("/api/locations/states", async (req, res) => {
    try {
      const { country } = req.body;
      
      if (country === "India") {
        const states = Object.keys(indianStatesAndCities).map(state => ({ name: state }));
        res.json({
          error: false,
          msg: `states in ${country} retrieved`,
          data: { states }
        });
      } else {
        res.json({
          error: true,
          msg: "Only India is supported",
          data: { states: [] }
        });
      }
    } catch (error) {
      console.error("States API error:", error);
      res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  app.post("/api/locations/cities", async (req, res) => {
    try {
      const { country, state } = req.body;
      
      if (country === "India" && state && indianStatesAndCities[state as keyof typeof indianStatesAndCities]) {
        const cities = indianStatesAndCities[state as keyof typeof indianStatesAndCities];
        res.json({
          error: false,
          msg: "cities retrieved",
          data: cities
        });
        return;
      }

      // Return empty array for unsupported states
      res.json({
        error: true,
        msg: "State not found or unsupported",
        data: []
      });
      
    } catch (error) {
      console.error("Cities API error:", error);
      res.status(500).json({ error: true, msg: "Failed to fetch cities" });
    }
  });

  // OTP verification endpoints
  app.post("/api/send-otp", async (req, res) => {
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
        blockedUntil: undefined,
      });

      // TODO: Send actual OTP via email/SMS
      console.log(`OTP for ${identifier}: ${otp}`);
      
      res.json({ message: "OTP sent successfully", remainingAttempts: 5 - ((attempts?.attempts || 0) + 1) });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

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
        blockedUntil: undefined,
      });

      // TODO: Send actual OTP via email/SMS
      console.log(`OTP for ${identifier}: ${otp}`);
      
      res.json({ message: "OTP sent successfully", remainingAttempts: 5 - ((attempts?.attempts || 0) + 1) });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/verify-otp", async (req, res) => {
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
      
      // Debug logging for CAPTCHA verification
      console.log("Signup CAPTCHA verification:", {
        sessionId: validatedData.captchaSessionId,
        answer: validatedData.captchaAnswer
      });
      
      // Check if CAPTCHA exists and get its current state
      const captcha = await storage.getCaptcha(validatedData.captchaSessionId || "");
      console.log("CAPTCHA state:", captcha);
      
      // Check if CAPTCHA was already solved (verified in the previous step)
      if (!captcha) {
        return res.status(400).json({ message: "Invalid CAPTCHA session. Please try again." });
      }

      if (new Date() > captcha.expiresAt) {
        return res.status(400).json({ message: "CAPTCHA has expired. Please try again." });
      }

      if (!captcha.solved) {
        return res.status(400).json({ message: "Please complete the CAPTCHA verification first." });
      }

      // Validate that the provided answer matches the solved captcha
      const { captchaService } = await import("./captcha-service.js");
      const answerMatches = captchaService.validateAnswer(validatedData.captchaAnswer || "", captcha.answer);
      
      if (!answerMatches) {
        return res.status(400).json({ message: "CAPTCHA answer does not match. Please try again." });
      }

      // Verify terms acceptance
      if (!validatedData.acceptTerms) {
        return res.status(400).json({ message: "You must accept the terms and conditions to create an account." });
      }

      // Check if user already exists
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Create user with encrypted password
      const user = await storage.createUser({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName || null,
        username: validatedData.username,
        email: validatedData.email,
        phone: validatedData.phone,
        countryCode: validatedData.countryCode,
        isWhatsApp: validatedData.isWhatsApp,
        gender: validatedData.gender || null,
        dateOfBirth: validatedData.dateOfBirth,
        country: validatedData.country,
        state: validatedData.state,
        city: validatedData.city,
        address: validatedData.address || null,
        password: validatedData.password, // Will be hashed in storage
        profilePicture: undefined,
      });

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.createSession({
        userId: user.id!,
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

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // TODO: Verify password hash
      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.createSession({
        userId: user.id!,
        sessionToken,
        expiresAt,
      });

      res.json({ 
        message: "Login successful", 
        sessionToken,
        user: { 
          id: user.id, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          email: user.email,
          role: user.role,
          roleStatus: user.roleStatus
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Firebase Google authentication endpoint
  app.post("/api/auth/firebase", async (req, res) => {
    try {
      const { firebaseUid, email, firstName, lastName, profilePicture } = req.body;
      
      if (!firebaseUid || !email) {
        return res.status(400).json({ message: "Firebase UID and email are required" });
      }

      // Check if user exists by Firebase UID
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        // Check if user exists by email
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Link existing account with Firebase
          user = await storage.updateUser(user.id!, { firebaseUid, profilePicture });
        } else {
          // Create new user
          user = await storage.createUser({
            firstName: firstName || "User",
            lastName: lastName || "",
            username: email.split("@")[0] + "_" + Date.now(), // Generate unique username
            email,
            phone: "",
            countryCode: "",
            isWhatsApp: false,
            gender: "",
            dateOfBirth: "",
            country: "",
            state: "",
            city: "",
            address: "",
            password: "", // No password for Firebase users
            firebaseUid,
            role: "customer", // Default role for Google sign-in users
            profilePicture,
          });
        }
      }

      if (!user) {
        return res.status(500).json({ message: "Failed to create or update user" });
      }

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.createSession({
        userId: user.id!,
        sessionToken,
        expiresAt,
      });

      res.json({ 
        message: "Firebase authentication successful", 
        sessionToken,
        user: { 
          id: user.id, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          email: user.email,
          role: user.role,
          roleStatus: user.roleStatus
        }
      });
    } catch (error) {
      console.error("Firebase auth error:", error);
      res.status(500).json({ message: "Firebase authentication failed" });
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
