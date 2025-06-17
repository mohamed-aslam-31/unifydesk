import { type User, type InsertUser, type Session, type InsertSession, type OtpAttempt, type InsertOtpAttempt, type RoleData, type InsertRoleData, type Captcha, type InsertCaptcha } from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phone: string, countryCode: string): Promise<User | undefined>;

  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSession(sessionToken: string): Promise<Session | undefined>;
  deleteSession(sessionToken: string): Promise<void>;

  // OTP methods
  getOtpAttempts(identifier: string, type: string): Promise<OtpAttempt | undefined>;
  createOrUpdateOtpAttempts(attempt: InsertOtpAttempt): Promise<OtpAttempt>;

  // Role data methods
  createRoleData(roleData: InsertRoleData): Promise<RoleData>;
  getRoleDataByUser(userId: number): Promise<RoleData[]>;

  // Validation methods
  isUsernameAvailable(username: string): Promise<boolean>;
  isEmailAvailable(email: string): Promise<boolean>;
  isPhoneAvailable(phone: string, countryCode: string): Promise<boolean>;

  // CAPTCHA methods
  createCaptcha(captcha: InsertCaptcha): Promise<Captcha>;
  getCaptcha(sessionId: string): Promise<Captcha | undefined>;
  verifyCaptcha(sessionId: string, answer: string): Promise<boolean>;
  cleanupExpiredCaptchas(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<string, Session>;
  private otpAttempts: Map<string, OtpAttempt>;
  private roleData: Map<number, RoleData>;
  private captchas: Map<string, Captcha>;
  private currentUserId: number;
  private currentRoleDataId: number;
  private currentOtpId: number;
  private currentSessionId: number;
  private currentCaptchaId: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.otpAttempts = new Map();
    this.roleData = new Map();
    this.captchas = new Map();
    this.currentUserId = 1;
    this.currentRoleDataId = 1;
    this.currentOtpId = 1;
    this.currentSessionId = 1;
    this.currentCaptchaId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByPhone(phone: string, countryCode: string): Promise<User | undefined> {
    const usersArray = Array.from(this.users.values());
    return usersArray.find(user => user.phone === phone && user.countryCode === countryCode);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = insertUser.password ? await bcrypt.hash(insertUser.password, 10) : insertUser.password;
    
    const user: User = {
      id: this.currentUserId++,
      firstName: insertUser.firstName,
      lastName: insertUser.lastName || null,
      username: insertUser.username,
      email: insertUser.email,
      phone: insertUser.phone,
      countryCode: insertUser.countryCode,
      isWhatsApp: insertUser.isWhatsApp || false,
      gender: insertUser.gender,
      dateOfBirth: insertUser.dateOfBirth,
      country: insertUser.country,
      state: insertUser.state,
      city: insertUser.city,
      address: insertUser.address || null,
      password: hashedPassword,

      role: insertUser.role || null,
      roleStatus: insertUser.roleStatus || 'pending',
      emailVerified: insertUser.emailVerified ?? false,
      phoneVerified: insertUser.phoneVerified ?? false,
      profilePicture: insertUser.profilePicture || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const sessionData: Session = {
      id: this.currentSessionId++,
      sessionToken: session.sessionToken,
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: new Date()
    };
    
    this.sessions.set(sessionData.sessionToken, sessionData);
    return sessionData;
  }

  async getSession(sessionToken: string): Promise<Session | undefined> {
    return this.sessions.get(sessionToken);
  }

  async deleteSession(sessionToken: string): Promise<void> {
    this.sessions.delete(sessionToken);
  }

  async getOtpAttempts(identifier: string, type: string): Promise<OtpAttempt | undefined> {
    const key = `${identifier}:${type}`;
    return this.otpAttempts.get(key);
  }

  async createOrUpdateOtpAttempts(attempt: InsertOtpAttempt): Promise<OtpAttempt> {
    const key = `${attempt.identifier}:${attempt.type}`;
    const existing = this.otpAttempts.get(key);
    
    if (existing) {
      const updated: OtpAttempt = {
        ...existing,
        attempts: attempt.attempts ?? 0,
        lastAttempt: attempt.lastAttempt ?? null,
        blockedUntil: attempt.blockedUntil ?? null
      };
      this.otpAttempts.set(key, updated);
      return updated;
    }

    const otpData: OtpAttempt = {
      id: this.currentOtpId++,
      identifier: attempt.identifier,
      type: attempt.type,
      attempts: attempt.attempts ?? 0,
      lastAttempt: attempt.lastAttempt ?? null,
      blockedUntil: attempt.blockedUntil ?? null,
      createdAt: new Date()
    };
    
    this.otpAttempts.set(key, otpData);
    return otpData;
  }

  async createRoleData(roleDataInsert: InsertRoleData): Promise<RoleData> {
    const data: RoleData = {
      id: this.currentRoleDataId++,
      userId: roleDataInsert.userId,
      role: roleDataInsert.role,
      data: roleDataInsert.data,
      createdAt: new Date()
    };
    
    this.roleData.set(data.id, data);
    return data;
  }

  async getRoleDataByUser(userId: number): Promise<RoleData[]> {
    const result: RoleData[] = [];
    for (const data of Array.from(this.roleData.values())) {
      if (data.userId === userId) {
        result.push(data);
      }
    }
    return result;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) {
        return false;
      }
    }
    return true;
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) {
        return false;
      }
    }
    return true;
  }

  async isPhoneAvailable(phone: string, countryCode: string): Promise<boolean> {
    for (const user of Array.from(this.users.values())) {
      if (user.phone === phone && user.countryCode === countryCode) {
        return false;
      }
    }
    return true;
  }

  async createCaptcha(insertCaptcha: InsertCaptcha): Promise<Captcha> {
    const captcha: Captcha = {
      id: this.currentCaptchaId++,
      sessionId: insertCaptcha.sessionId,
      question: insertCaptcha.question,
      answer: insertCaptcha.answer,
      expiresAt: insertCaptcha.expiresAt,
      attempts: insertCaptcha.attempts ?? 0,
      solved: insertCaptcha.solved ?? false,
      createdAt: new Date()
    };
    
    this.captchas.set(captcha.sessionId, captcha);
    return captcha;
  }

  async getCaptcha(sessionId: string): Promise<Captcha | undefined> {
    return this.captchas.get(sessionId);
  }

  async verifyCaptcha(sessionId: string, answer: string): Promise<boolean> {
    const captcha = this.captchas.get(sessionId);
    if (!captcha || new Date() > captcha.expiresAt) {
      return false;
    }

    // If already solved, just check if the answer matches (for signup verification)
    if (captcha.solved) {
      return captcha.answer.toLowerCase() === answer.toLowerCase();
    }

    const newAttempts = captcha.attempts + 1;
    
    if (captcha.answer.toLowerCase() === answer.toLowerCase()) {
      captcha.attempts = newAttempts;
      captcha.solved = true;
      this.captchas.set(sessionId, captcha);
      return true;
    }

    if (newAttempts >= 3) {
      this.captchas.delete(sessionId);
    } else {
      captcha.attempts = newAttempts;
      this.captchas.set(sessionId, captcha);
    }

    return false;
  }

  async cleanupExpiredCaptchas(): Promise<void> {
    const now = new Date();
    for (const [sessionId, captcha] of Array.from(this.captchas.entries())) {
      if (now > captcha.expiresAt) {
        this.captchas.delete(sessionId);
      }
    }
  }
}

// Dynamic storage selection based on environment
let storageInstance: IStorage;

async function initializeStorage(): Promise<IStorage> {
  if (process.env.DATABASE_URL) {
    try {
      console.log("Initializing PostgreSQL storage...");
      const { storage: pgStorage } = await import("./storage-pg.js");
      await pgStorage.getUser(1); // Test connection
      console.log("PostgreSQL storage initialized successfully");
      return pgStorage;
    } catch (error) {
      console.log("PostgreSQL storage failed, trying Replit Database...");
      try {
        const { storage: replitStorage } = await import("./storage-replit.js");
        await replitStorage.getUser(1);
        console.log("Replit Database storage initialized successfully");
        return replitStorage;
      } catch (replitError) {
        console.log("All database connections failed, using in-memory storage");
        return new MemStorage();
      }
    }
  } else {
    try {
      console.log("No PostgreSQL URL found, trying Replit Database...");
      const { storage: replitStorage } = await import("./storage-replit.js");
      await replitStorage.getUser(1);
      console.log("Replit Database storage initialized successfully"); 
      return replitStorage;
    } catch (replitError) {
      console.log("Replit Database failed, using in-memory storage");
      return new MemStorage();
    }
  }
}

// Initialize storage asynchronously
const storagePromise = initializeStorage();

// Export a proxy that waits for initialization
export const storage: IStorage = new Proxy({} as IStorage, {
  get(target, prop) {
    return async (...args: any[]) => {
      if (!storageInstance) {
        storageInstance = await storagePromise;
      }
      const method = (storageInstance as any)[prop];
      if (typeof method === 'function') {
        return method.apply(storageInstance, args);
      }
      return method;
    };
  }
});