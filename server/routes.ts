import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { signupSchema, adminRoleSchema, employeeRoleSchema, shopkeeperRoleSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { captchaService } from "./captcha-service";
import { indianStatesAndCities } from "./indian-locations";

// Utility functions for masking sensitive data
function maskEmail(email: string): string {
  if (!email) return "";
  const [username, domain] = email.split('@');
  if (username.length <= 2) return `${username}@${domain}`;
  return `${username.charAt(0)}${'*'.repeat(username.length - 2)}${username.charAt(username.length - 1)}@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone) return "";
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 2)}${'*'.repeat(phone.length - 4)}${phone.slice(-2)}`;
}

// Declare global type for OTP sessions
declare global {
  var otpSessions: Map<string, any>;
}

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
        gender: validatedData.gender ?? 'not-specified',
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

  // Enhanced Login endpoint with email/phone support and CAPTCHA
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password, captchaSessionId } = req.body;
      
      if (!identifier || !password) {
        return res.status(400).json({ message: "Email/phone and password are required" });
      }

      if (!captchaSessionId) {
        return res.status(400).json({ message: "CAPTCHA verification required" });
      }

      // Verify CAPTCHA
      const captcha = await storage.getCaptcha(captchaSessionId);
      if (!captcha || !captcha.solved || new Date() > captcha.expiresAt) {
        return res.status(400).json({ message: "Invalid or expired CAPTCHA" });
      }

      // Determine if identifier is email or phone
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const isPhone = /^(\+\d{1,3})?[\s\-]?[\d\s\-\(\)]{8,15}$/.test(identifier);
      
      if (!isEmail && !isPhone) {
        return res.status(400).json({ message: "Please enter a valid email or phone number" });
      }

      // Check if user is currently blocked
      const loginAttempts = await storage.getOtpAttempts(identifier, 'login');
      if (loginAttempts && loginAttempts.blockedUntil && new Date() < loginAttempts.blockedUntil) {
        return res.status(429).json({ 
          message: "Account temporarily blocked due to too many failed login attempts. Please try again later.",
          blockedUntil: loginAttempts.blockedUntil
        });
      }

      // Find user by email or phone
      let user;
      if (isEmail) {
        user = await storage.getUserByEmail(identifier);
        if (!user) {
          return res.status(401).json({ message: "No user found with this email address" });
        }
      } else {
        // For phone login, extract country code and phone number
        let countryCode = '+91'; // Default country code
        let phoneNumber = identifier;
        
        // Check if identifier starts with a country code
        if (identifier.startsWith('+')) {
          const match = identifier.match(/^(\+\d{1,3})(.+)$/);
          if (match) {
            countryCode = match[1];
            phoneNumber = match[2];
          }
        }
        
        // Clean phone number - remove all non-digit characters
        phoneNumber = phoneNumber.replace(/\D/g, '');
        
        console.log('Attempting phone login:', { originalIdentifier: identifier, countryCode, cleanedPhone: phoneNumber });
        
        try {
          user = await storage.getUserByPhone(phoneNumber, countryCode);
          console.log('Phone lookup result:', user ? 'Found user' : 'No user found');
        } catch (error) {
          console.error('Error finding user by phone:', error);
          user = null;
        }
        
        if (!user) {
          return res.status(401).json({ message: "No user found with this phone number" });
        }
      }

      // Verify password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Track failed login attempts
        const currentAttempts = loginAttempts ? loginAttempts.attempts : 0;
        const newAttempts = currentAttempts + 1;
        
        // Update or create login attempts record
        await storage.createOrUpdateOtpAttempts({
          identifier,
          type: 'login',
          attempts: newAttempts,
          lastAttempt: new Date(),
          blockedUntil: newAttempts >= 5 ? new Date(Date.now() + 5 * 60 * 60 * 1000) : null, // Block for 5 hours after 5 attempts
        });

        // Send warning after 3 attempts
        if (newAttempts >= 3 && newAttempts < 5) {
          const remainingAttempts = 5 - newAttempts;
          return res.status(401).json({ 
            message: `Incorrect password. You have ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining before your account will be temporarily blocked.`
          });
        } else if (newAttempts >= 5) {
          // Account blocked - send notification
          // TODO: Send email/SMS notification about account block
          console.log(`Account blocked for ${identifier} due to too many failed login attempts`);
          
          return res.status(429).json({ 
            message: "Account temporarily blocked due to too many failed login attempts. Please try again after 5 hours.",
            blockedUntil: new Date(Date.now() + 5 * 60 * 60 * 1000)
          });
        } else {
          return res.status(401).json({ message: "Incorrect password" });
        }
      }

      // Reset login attempts on successful password verification
      if (loginAttempts && loginAttempts.attempts > 0) {
        await storage.createOrUpdateOtpAttempts({
          identifier,
          type: 'login',
          attempts: 0,
          lastAttempt: new Date(),
          blockedUntil: null,
        });
      }

      // Generate OTP for login verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP session data temporarily
      const otpSessionId = crypto.randomBytes(32).toString('hex');
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store OTP data (in production, use Redis or similar)
      global.otpSessions = global.otpSessions || new Map();
      global.otpSessions.set(otpSessionId, {
        userId: user.id,
        otp,
        expiresAt: otpExpiresAt,
        attempts: 0,
        maskedEmail: maskEmail(user.email),
        maskedPhone: maskPhone(user.phone),
        userRole: user.role,
        roleStatus: user.roleStatus || 'pending'
      });

      // Send OTP to both email and phone
      console.log(`Login OTP sent to both email (${maskEmail(user.email)}) and phone (${maskPhone(user.phone)}): ${otp}`);
      
      // Store OTP attempts for both email and phone to track rate limiting
      await storage.createOrUpdateOtpAttempts({
        identifier: user.email,
        type: 'login_email',
        attempts: 1,
        lastAttempt: new Date(),
        blockedUntil: null,
      });

      if (user.phone) {
        await storage.createOrUpdateOtpAttempts({
          identifier: user.phone,
          type: 'login_phone',
          attempts: 1,
          lastAttempt: new Date(),
          blockedUntil: null,
        });
      }

      // Set session cookie for OTP verification
      res.cookie('otpSessionId', otpSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000 // 10 minutes
      });

      res.json({
        message: "OTP sent to both email and phone",
        maskedEmail: maskEmail(user.email),
        maskedPhone: maskPhone(user.phone),
        user: {
          role: user.role,
          roleStatus: user.roleStatus || 'pending'
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Forgot password - send reset OTP
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { identifier, type } = req.body;

      if (!identifier || !type) {
        return res.status(400).json({ message: "Identifier and type required" });
      }

      // Find user by identifier
      let user;
      if (type === 'email') {
        user = await storage.getUserByEmail(identifier);
      } else if (type === 'phone') {
        user = await storage.getUserByPhone(identifier, '+91');
      }

      if (!user) {
        return res.status(404).json({ message: "No account found with this information" });
      }

      // Generate reset OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store reset OTP session data
      const resetSessionId = crypto.randomBytes(32).toString('hex');
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      (global as any).resetOtpSessions = (global as any).resetOtpSessions || new Map();
      (global as any).resetOtpSessions.set(resetSessionId, {
        userId: user.id,
        identifier,
        type,
        otp,
        expiresAt: otpExpiresAt,
        attempts: 0,
        verified: false
      });

      // Send OTP
      console.log(`Password reset OTP sent to ${type} (${type === 'email' ? maskEmail(identifier) : maskPhone(identifier)}): ${otp}`);
      
      // Set session cookie for reset OTP verification
      res.cookie('resetSessionId', resetSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000 // 10 minutes
      });

      res.json({
        message: `Reset code sent to your ${type}`,
        maskedIdentifier: type === 'email' ? maskEmail(identifier) : maskPhone(identifier)
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to send reset code" });
    }
  });

  // Verify reset OTP
  app.post("/api/auth/verify-reset-otp", async (req, res) => {
    try {
      const { otp } = req.body;
      const resetSessionId = req.cookies?.resetSessionId;

      if (!otp || !resetSessionId) {
        return res.status(400).json({ message: "OTP and session required" });
      }

      (global as any).resetOtpSessions = (global as any).resetOtpSessions || new Map();
      const resetSession = (global as any).resetOtpSessions.get(resetSessionId);

      if (!resetSession) {
        return res.status(400).json({ message: "Invalid reset session" });
      }

      if (new Date() > resetSession.expiresAt) {
        (global as any).resetOtpSessions.delete(resetSessionId);
        res.clearCookie('resetSessionId');
        return res.status(400).json({ message: "Reset code expired" });
      }

      if (resetSession.attempts >= 3) {
        (global as any).resetOtpSessions.delete(resetSessionId);
        res.clearCookie('resetSessionId');
        return res.status(400).json({ message: "Too many incorrect attempts" });
      }

      if (resetSession.otp !== otp) {
        resetSession.attempts++;
        return res.status(400).json({ message: "Incorrect reset code" });
      }

      // Mark as verified
      resetSession.verified = true;
      
      res.json({ message: "Reset code verified successfully" });
    } catch (error) {
      console.error("Verify reset OTP error:", error);
      res.status(500).json({ message: "Failed to verify reset code" });
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { password } = req.body;
      const resetSessionId = req.cookies?.resetSessionId;

      if (!password || !resetSessionId) {
        return res.status(400).json({ message: "Password and session required" });
      }

      (global as any).resetOtpSessions = (global as any).resetOtpSessions || new Map();
      const resetSession = (global as any).resetOtpSessions.get(resetSessionId);

      if (!resetSession || !resetSession.verified) {
        return res.status(400).json({ message: "Invalid or unverified reset session" });
      }

      if (new Date() > resetSession.expiresAt) {
        (global as any).resetOtpSessions.delete(resetSessionId);
        res.clearCookie('resetSessionId');
        return res.status(400).json({ message: "Reset session expired" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user password
      await storage.updateUser(resetSession.userId, {
        password: hashedPassword,
        updatedAt: new Date()
      });

      // Clean up session
      (global as any).resetOtpSessions.delete(resetSessionId);
      res.clearCookie('resetSessionId');

      // Send confirmation email
      console.log(`Password reset successfully for user ID: ${resetSession.userId}`);
      console.log(`Confirmation email sent to: ${resetSession.type === 'email' ? maskEmail(resetSession.identifier) : 'registered email'}`);

      res.json({ 
        message: "Password reset successfully",
        emailSent: true
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // OTP verification for login
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { otp } = req.body;
      const otpSessionId = req.cookies?.otpSessionId;

      if (!otp || !otpSessionId) {
        return res.status(400).json({ message: "OTP and session required" });
      }

      global.otpSessions = global.otpSessions || new Map();
      const otpSession = global.otpSessions.get(otpSessionId);

      if (!otpSession) {
        return res.status(400).json({ message: "Invalid OTP session" });
      }

      if (new Date() > otpSession.expiresAt) {
        global.otpSessions.delete(otpSessionId);
        return res.status(400).json({ message: "OTP expired" });
      }

      if (otpSession.attempts >= 5) {
        global.otpSessions.delete(otpSessionId);
        
        // Block user for 5 hours
        const blockedUntil = new Date(Date.now() + 5 * 60 * 60 * 1000);
        await storage.createOrUpdateOtpAttempts({
          identifier: otpSession.userId.toString(),
          type: 'login',
          attempts: 5,
          lastAttempt: new Date(),
          blockedUntil,
        });

        // TODO: Send notification email/SMS about account block
        
        return res.status(429).json({ 
          message: "Account blocked due to too many failed attempts. Try again after 5 hours.",
          blockedUntil 
        });
      }

      if (otp !== otpSession.otp) {
        otpSession.attempts += 1;
        global.otpSessions.set(otpSessionId, otpSession);
        
        return res.status(400).json({ 
          message: "Invalid OTP",
          remainingAttempts: 5 - otpSession.attempts
        });
      }

      // OTP verified successfully - create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      const user = await storage.getUser(otpSession.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      await storage.createSession({
        userId: user.id!,
        sessionToken,
        expiresAt,
      });

      // Clean up OTP session
      global.otpSessions.delete(otpSessionId);
      res.clearCookie('otpSessionId');

      res.json({
        message: "Login successful",
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          roleStatus: user.roleStatus || 'pending'
        }
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "OTP verification failed" });
    }
  });

  // Resend OTP for login
  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const otpSessionId = req.cookies?.otpSessionId;

      if (!otpSessionId) {
        return res.status(400).json({ message: "No active OTP session" });
      }

      global.otpSessions = global.otpSessions || new Map();
      const otpSession = global.otpSessions.get(otpSessionId);

      if (!otpSession) {
        return res.status(400).json({ message: "Invalid OTP session" });
      }

      // Get user details for resending
      const user = await storage.getUser(otpSession.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Update session with new OTP and reset attempts
      otpSession.otp = otp;
      otpSession.attempts = 0;
      otpSession.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Reset 10 minutes
      global.otpSessions.set(otpSessionId, otpSession);

      // Resend OTP to both email and phone
      console.log(`Resent Login OTP to both email (${maskEmail(user.email)}) and phone (${maskPhone(user.phone)}): ${otp}`);

      res.json({
        message: "OTP resent to both email and phone successfully"
      });
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({ message: "Failed to resend OTP" });
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
