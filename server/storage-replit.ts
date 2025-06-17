import { type User, type InsertUser, type Session, type InsertSession, type OtpAttempt, type InsertOtpAttempt, type RoleData, type InsertRoleData, type Captcha, type InsertCaptcha } from "@shared/schema";
import bcrypt from "bcryptjs";
import Database from "@replit/database";

const db = new Database();

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
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

export class ReplitStorage implements IStorage {
  private async getNextId(type: string): Promise<number> {
    try {
      const currentId = (await db.get(`${type}_counter`)) || 0;
      const nextId = currentId + 1;
      await db.set(`${type}_counter`, nextId);
      return nextId;
    } catch (error) {
      console.error(`Error getting next ID for ${type}:`, error);
      return 1;
    }
  }

  private async getAllUsers(): Promise<User[]> {
    try {
      const userKeys = await db.list("user:");
      const users: User[] = [];
      for (const key of userKeys) {
        try {
          const user = await db.get(key);
          if (user) users.push(user);
        } catch (error) {
          console.error(`Error getting user ${key}:`, error);
        }
      }
      return users;
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  private async getAllSessions(): Promise<Session[]> {
    try {
      const sessionKeys = await db.list("session:");
      const sessions: Session[] = [];
      for (const key of sessionKeys) {
        try {
          const session = await db.get(key);
          if (session) sessions.push(session);
        } catch (error) {
          console.error(`Error getting session ${key}:`, error);
        }
      }
      return sessions;
    } catch (error) {
      console.error("Error getting all sessions:", error);
      return [];
    }
  }

  private async getAllRoleData(): Promise<RoleData[]> {
    try {
      const roleKeys = await db.list("role_data:");
      const roleData: RoleData[] = [];
      for (const key of roleKeys) {
        try {
          const data = await db.get(key);
          if (data) roleData.push(data);
        } catch (error) {
          console.error(`Error getting role data ${key}:`, error);
        }
      }
      return roleData;
    } catch (error) {
      console.error("Error getting all role data:", error);
      return [];
    }
  }

  private async getAllCaptchas(): Promise<Captcha[]> {
    try {
      const captchaKeys = await db.list("captcha:");
      const captchas: Captcha[] = [];
      for (const key of captchaKeys) {
        try {
          const captcha = await db.get(key);
          if (captcha) captchas.push(captcha);
        } catch (error) {
          console.error(`Error getting captcha ${key}:`, error);
        }
      }
      return captchas;
    } catch (error) {
      console.error("Error getting all captchas:", error);
      return [];
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return await db.get(`user:${id}`);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.getAllUsers();
    return users.find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.getAllUsers();
    return users.find(user => user.username === username);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const users = await this.getAllUsers();
    return users.find(user => user.firebaseUid === firebaseUid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = insertUser.password ? await bcrypt.hash(insertUser.password, 10) : insertUser.password;
    const id = await this.getNextId("user");
    
    const user: User = {
      id,
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
      firebaseUid: insertUser.firebaseUid || null,
      role: insertUser.role || null,
      roleStatus: insertUser.roleStatus || 'pending',
      emailVerified: insertUser.emailVerified ?? false,
      phoneVerified: insertUser.phoneVerified ?? false,
      profilePicture: insertUser.profilePicture || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.set(`user:${id}`, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    await db.set(`user:${id}`, updatedUser);
    return updatedUser;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const id = await this.getNextId("session");
    const sessionData: Session = {
      id,
      sessionToken: session.sessionToken,
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: new Date()
    };
    
    await db.set(`session:${session.sessionToken}`, sessionData);
    await db.set(`session_by_id:${id}`, sessionData);
    return sessionData;
  }

  async getSession(sessionToken: string): Promise<Session | undefined> {
    return await db.get(`session:${sessionToken}`);
  }

  async deleteSession(sessionToken: string): Promise<void> {
    const session = await db.get(`session:${sessionToken}`);
    if (session) {
      await db.delete(`session:${sessionToken}`);
      await db.delete(`session_by_id:${session.id}`);
    }
  }

  async getOtpAttempts(identifier: string, type: string): Promise<OtpAttempt | undefined> {
    const key = `otp:${identifier}:${type}`;
    return await db.get(key);
  }

  async createOrUpdateOtpAttempts(attempt: InsertOtpAttempt): Promise<OtpAttempt> {
    const key = `otp:${attempt.identifier}:${attempt.type}`;
    const existing = await db.get(key);
    
    if (existing) {
      const updated: OtpAttempt = {
        ...existing,
        attempts: attempt.attempts,
        lastAttempt: attempt.lastAttempt,
        blockedUntil: attempt.blockedUntil,
        updatedAt: new Date()
      };
      await db.set(key, updated);
      return updated;
    }

    const id = await this.getNextId("otp");
    const otpData: OtpAttempt = {
      id,
      identifier: attempt.identifier,
      type: attempt.type,
      attempts: attempt.attempts,
      lastAttempt: attempt.lastAttempt,
      blockedUntil: attempt.blockedUntil,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.set(key, otpData);
    return otpData;
  }

  async createRoleData(roleDataInsert: InsertRoleData): Promise<RoleData> {
    const id = await this.getNextId("role_data");
    const data: RoleData = {
      id,
      userId: roleDataInsert.userId,
      role: roleDataInsert.role,
      data: roleDataInsert.data,
      createdAt: new Date()
    };
    
    await db.set(`role_data:${id}`, data);
    return data;
  }

  async getRoleDataByUser(userId: number): Promise<RoleData[]> {
    const allRoleData = await this.getAllRoleData();
    return allRoleData.filter(data => data.userId === userId);
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const users = await this.getAllUsers();
    return !users.some(user => user.username === username);
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const users = await this.getAllUsers();
    return !users.some(user => user.email === email);
  }

  async isPhoneAvailable(phone: string, countryCode: string): Promise<boolean> {
    const users = await this.getAllUsers();
    return !users.some(user => user.phone === phone && user.countryCode === countryCode);
  }

  async createCaptcha(insertCaptcha: InsertCaptcha): Promise<Captcha> {
    const id = await this.getNextId("captcha");
    const captcha: Captcha = {
      id,
      sessionId: insertCaptcha.sessionId,
      question: insertCaptcha.question,
      answer: insertCaptcha.answer,
      expiresAt: insertCaptcha.expiresAt,
      attempts: insertCaptcha.attempts ?? 0,
      solved: insertCaptcha.solved ?? false,
      createdAt: new Date()
    };
    
    await db.set(`captcha:${captcha.sessionId}`, captcha);
    return captcha;
  }

  async getCaptcha(sessionId: string): Promise<Captcha | undefined> {
    return await db.get(`captcha:${sessionId}`);
  }

  async verifyCaptcha(sessionId: string, answer: string): Promise<boolean> {
    try {
      const captcha = await db.get(`captcha:${sessionId}`);
      if (!captcha || new Date() > captcha.expiresAt) {
        return false;
      }

      // Validate input parameters
      if (!answer || typeof answer !== 'string') {
        console.log('Invalid answer provided:', answer);
        return false;
      }

      // Validate captcha answer
      if (!captcha.answer || typeof captcha.answer !== 'string') {
        console.log('Invalid captcha answer in database:', captcha.answer);
        return false;
      }

      console.log('CAPTCHA verification:', { 
        sessionId, 
        userAnswer: answer, 
        correctAnswer: captcha.answer,
        solved: captcha.solved 
      });

      // If already solved, just check if the answer matches (for signup verification)
      if (captcha.solved) {
        return captcha.answer.toLowerCase() === answer.toLowerCase();
      }

      const newAttempts = captcha.attempts + 1;
      
      if (captcha.answer.toLowerCase() === answer.toLowerCase()) {
        captcha.attempts = newAttempts;
        captcha.solved = true;
        await db.set(`captcha:${sessionId}`, captcha);
        console.log('CAPTCHA verified successfully');
        return true;
      }

      if (newAttempts >= 3) {
        await db.delete(`captcha:${sessionId}`);
      } else {
        captcha.attempts = newAttempts;
        await db.set(`captcha:${sessionId}`, captcha);
      }

      console.log('CAPTCHA verification failed - wrong answer');
      return false;
    } catch (error) {
      console.error('CAPTCHA verification error:', error);
      return false;
    }
  }

  async cleanupExpiredCaptchas(): Promise<void> {
    const now = new Date();
    const allCaptchas = await this.getAllCaptchas();
    
    for (const captcha of allCaptchas) {
      if (now > captcha.expiresAt) {
        await db.delete(`captcha:${captcha.sessionId}`);
      }
    }
  }
}

export const storage = new ReplitStorage();