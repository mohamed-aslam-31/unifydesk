import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { db } from './db';
import { users, sessions, otpAttempts, roleData } from './schema';
import type { User, NewUser, Session, NewSession, OtpAttempt, NewOtpAttempt, RoleData, NewRoleData } from './schema';
import { User as SharedUser, Session as SharedSession, OtpAttempt as SharedOtpAttempt, RoleData as SharedRoleData, InsertUser, InsertSession, InsertOtpAttempt, InsertRoleData, InsertCaptcha } from '@shared/schema';
import type { Captcha } from '@shared/schema';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<SharedUser | undefined>;
  getUserByEmail(email: string): Promise<SharedUser | undefined>;
  getUserByUsername(username: string): Promise<SharedUser | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<SharedUser | undefined>;
  createUser(user: InsertUser): Promise<SharedUser>;
  updateUser(id: number, updates: Partial<SharedUser>): Promise<SharedUser | undefined>;

  // Session methods
  createSession(session: InsertSession): Promise<SharedSession>;
  getSession(sessionToken: string): Promise<SharedSession | undefined>;
  deleteSession(sessionToken: string): Promise<void>;

  // OTP methods
  getOtpAttempts(identifier: string, type: string): Promise<SharedOtpAttempt | undefined>;
  createOrUpdateOtpAttempts(attempt: InsertOtpAttempt): Promise<SharedOtpAttempt>;

  // Role data methods
  createRoleData(roleData: InsertRoleData): Promise<SharedRoleData>;
  getRoleDataByUser(userId: number): Promise<SharedRoleData[]>;

  // Validation methods
  isUsernameAvailable(username: string): Promise<boolean>;
  isEmailAvailable(email: string): Promise<boolean>;
}

export class PostgreSQLStorage implements IStorage {
  async getUser(id: number): Promise<SharedUser | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ? this.convertUser(result[0]) : undefined;
  }

  async getUserByEmail(email: string): Promise<SharedUser | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ? this.convertUser(result[0]) : undefined;
  }

  async getUserByUsername(username: string): Promise<SharedUser | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] ? this.convertUser(result[0]) : undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<SharedUser | undefined> {
    const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    return result[0] ? this.convertUser(result[0]) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<SharedUser> {
    // Hash password
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);

    const userData: NewUser = {
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      username: insertUser.username,
      email: insertUser.email,
      phone: insertUser.phone,
      countryCode: insertUser.countryCode,
      isWhatsApp: insertUser.isWhatsApp,
      gender: insertUser.gender,
      dateOfBirth: insertUser.dateOfBirth,
      country: insertUser.country,
      state: insertUser.state,
      city: insertUser.city,
      address: insertUser.address,
      password: hashedPassword,
      firebaseUid: insertUser.firebaseUid,
      role: insertUser.role,
      emailVerified: false,
      phoneVerified: false,
      roleStatus: "pending",
    };

    const result = await db.insert(users).values(userData).returning();
    return this.convertUser(result[0]);
  }

  async updateUser(id: number, updates: Partial<SharedUser>): Promise<SharedUser | undefined> {
    const updateData: Partial<NewUser> = {
      ...updates,
      updatedAt: new Date(),
    };

    const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0] ? this.convertUser(result[0]) : undefined;
  }

  async createSession(session: InsertSession): Promise<SharedSession> {
    const sessionData: NewSession = {
      userId: session.userId,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
    };

    const result = await db.insert(sessions).values(sessionData).returning();
    return this.convertSession(result[0]);
  }

  async getSession(sessionToken: string): Promise<SharedSession | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.sessionToken, sessionToken)).limit(1);
    if (result[0] && result[0].expiresAt > new Date()) {
      return this.convertSession(result[0]);
    }
    if (result[0]) {
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    }
    return undefined;
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
  }

  async getOtpAttempts(identifier: string, type: string): Promise<SharedOtpAttempt | undefined> {
    const result = await db.select().from(otpAttempts)
      .where(and(eq(otpAttempts.identifier, identifier), eq(otpAttempts.type, type)))
      .limit(1);
    return result[0] ? this.convertOtpAttempt(result[0]) : undefined;
  }

  async createOrUpdateOtpAttempts(attempt: InsertOtpAttempt): Promise<SharedOtpAttempt> {
    const existing = await this.getOtpAttempts(attempt.identifier, attempt.type);

    if (existing) {
      const updateData: Partial<NewOtpAttempt> = {
        attempts: attempt.attempts ?? existing.attempts,
        lastAttempt: attempt.lastAttempt ?? existing.lastAttempt,
        blockedUntil: attempt.blockedUntil ?? existing.blockedUntil,
      };

      const result = await db.update(otpAttempts)
        .set(updateData)
        .where(and(eq(otpAttempts.identifier, attempt.identifier), eq(otpAttempts.type, attempt.type)))
        .returning();
      return this.convertOtpAttempt(result[0]);
    } else {
      const otpData: NewOtpAttempt = {
        identifier: attempt.identifier,
        type: attempt.type,
        attempts: attempt.attempts ?? 0,
        lastAttempt: attempt.lastAttempt,
        blockedUntil: attempt.blockedUntil,
      };

      const result = await db.insert(otpAttempts).values(otpData).returning();
      return this.convertOtpAttempt(result[0]);
    }
  }

  async createRoleData(roleDataInsert: InsertRoleData): Promise<SharedRoleData> {
    const data: NewRoleData = {
      userId: roleDataInsert.userId,
      role: roleDataInsert.role,
      data: roleDataInsert.data,
    };

    const result = await db.insert(roleData).values(data).returning();
    return this.convertRoleData(result[0]);
  }

  async getRoleDataByUser(userId: number): Promise<SharedRoleData[]> {
    const result = await db.select().from(roleData).where(eq(roleData.userId, userId));
    return result.map(data => this.convertRoleData(data));
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result.length === 0;
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result.length === 0;
  }

  async isPhoneAvailable(phone: string, countryCode: string): Promise<boolean> {
    const result = await db.select().from(users).where(
      and(eq(users.phone, phone), eq(users.countryCode, countryCode))
    ).limit(1);
    return result.length === 0;
  }

  // CAPTCHA methods - delegate to Replit Database for now
  async createCaptcha(captcha: InsertCaptcha): Promise<Captcha> {
    // Import Replit storage for CAPTCHA operations
    const { storage: replitStorage } = await import("./storage-replit.js");
    return replitStorage.createCaptcha(captcha);
  }

  async getCaptcha(sessionId: string): Promise<Captcha | undefined> {
    const { storage: replitStorage } = await import("./storage-replit.js");
    return replitStorage.getCaptcha(sessionId);
  }

  async verifyCaptcha(sessionId: string, answer: string): Promise<boolean> {
    const { storage: replitStorage } = await import("./storage-replit.js");
    return replitStorage.verifyCaptcha(sessionId, answer);
  }

  async cleanupExpiredCaptchas(): Promise<void> {
    const { storage: replitStorage } = await import("./storage-replit.js");
    return replitStorage.cleanupExpiredCaptchas();
  }

  // Helper methods to convert PostgreSQL types to shared schema types
  private convertUser(user: User): SharedUser {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      countryCode: user.countryCode,
      isWhatsApp: user.isWhatsApp,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      country: user.country,
      state: user.state,
      city: user.city,
      address: user.address || undefined,
      password: user.password,
      firebaseUid: user.firebaseUid || undefined,
      role: user.role || undefined,
      roleStatus: user.roleStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      profilePicture: user.profilePicture || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private convertSession(session: Session): SharedSession {
    return {
      id: session.id,
      userId: session.userId,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  private convertOtpAttempt(attempt: OtpAttempt): SharedOtpAttempt {
    return {
      id: attempt.id,
      identifier: attempt.identifier,
      type: attempt.type,
      attempts: attempt.attempts,
      lastAttempt: attempt.lastAttempt || undefined,
      blockedUntil: attempt.blockedUntil || undefined,
      createdAt: attempt.createdAt,
    };
  }

  private convertRoleData(data: RoleData): SharedRoleData {
    return {
      id: data.id,
      userId: data.userId,
      role: data.role,
      data: data.data,
      createdAt: data.createdAt,
    };
  }
}

export const storage = new PostgreSQLStorage();