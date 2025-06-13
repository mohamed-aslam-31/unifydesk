import { type User, type InsertUser, type Session, type InsertSession, type OtpAttempt, type InsertOtpAttempt, type RoleData, type InsertRoleData, users, sessions, otpAttempts, roleData } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<string, Session>;
  private otpAttempts: Map<string, OtpAttempt>;
  private roleData: Map<number, RoleData>;
  private currentUserId: number;
  private currentRoleDataId: number;
  private currentOtpId: number;
  private currentSessionId: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.otpAttempts = new Map();
    this.roleData = new Map();
    this.currentUserId = 1;
    this.currentRoleDataId = 1;
    this.currentOtpId = 1;
    this.currentSessionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.firebaseUid === firebaseUid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = {
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      username: insertUser.username,
      email: insertUser.email,
      phone: insertUser.phone,
      countryCode: insertUser.countryCode,
      isWhatsApp: insertUser.isWhatsApp ?? false,
      gender: insertUser.gender,
      dateOfBirth: insertUser.dateOfBirth,
      country: insertUser.country,
      state: insertUser.state,
      city: insertUser.city,
      address: insertUser.address || null,
      password: insertUser.password,
      firebaseUid: insertUser.firebaseUid || null,
      role: insertUser.role || null,
      roleStatus: insertUser.roleStatus || "pending",
      profilePicture: insertUser.profilePicture || null,
      id,
      emailVerified: false,
      phoneVerified: false,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const id = this.currentSessionId++;
    const sessionData: Session = {
      ...session,
      id,
      createdAt: new Date(),
    };
    this.sessions.set(session.sessionToken, sessionData);
    return sessionData;
  }

  async getSession(sessionToken: string): Promise<Session | undefined> {
    const session = this.sessions.get(sessionToken);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    if (session) {
      this.sessions.delete(sessionToken);
    }
    return undefined;
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
        attempts: attempt.attempts || existing.attempts,
        lastAttempt: attempt.lastAttempt || existing.lastAttempt,
        blockedUntil: attempt.blockedUntil || existing.blockedUntil,
      };
      this.otpAttempts.set(key, updated);
      return updated;
    } else {
      const id = this.currentOtpId++;
      const otpData: OtpAttempt = {
        ...attempt,
        id,
        createdAt: new Date(),
      };
      this.otpAttempts.set(key, otpData);
      return otpData;
    }
  }

  async createRoleData(roleDataInsert: InsertRoleData): Promise<RoleData> {
    const id = this.currentRoleDataId++;
    const data: RoleData = {
      ...roleDataInsert,
      id,
      createdAt: new Date(),
    };
    this.roleData.set(id, data);
    return data;
  }

  async getRoleDataByUser(userId: number): Promise<RoleData[]> {
    return Array.from(this.roleData.values()).filter(data => data.userId === userId);
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    return !Array.from(this.users.values()).some(user => user.username === username);
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    return !Array.from(this.users.values()).some(user => user.email === email);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        address: insertUser.address || null,
        isWhatsApp: insertUser.isWhatsApp ?? false
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db
      .insert(sessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getSession(sessionToken: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));
    return session || undefined;
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
  }

  async getOtpAttempts(identifier: string, type: string): Promise<OtpAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(otpAttempts)
      .where(and(eq(otpAttempts.identifier, identifier), eq(otpAttempts.type, type)));
    return attempt || undefined;
  }

  async createOrUpdateOtpAttempts(attempt: InsertOtpAttempt): Promise<OtpAttempt> {
    const existing = await this.getOtpAttempts(attempt.identifier, attempt.type);
    
    if (existing) {
      const [updated] = await db
        .update(otpAttempts)
        .set({
          attempts: attempt.attempts || existing.attempts,
          lastAttempt: attempt.lastAttempt || existing.lastAttempt,
          blockedUntil: attempt.blockedUntil || existing.blockedUntil
        })
        .where(eq(otpAttempts.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newAttempt] = await db
        .insert(otpAttempts)
        .values({
          ...attempt,
          attempts: attempt.attempts || 0
        })
        .returning();
      return newAttempt;
    }
  }

  async createRoleData(roleDataInsert: InsertRoleData): Promise<RoleData> {
    const [data] = await db
      .insert(roleData)
      .values(roleDataInsert)
      .returning();
    return data;
  }

  async getRoleDataByUser(userId: number): Promise<RoleData[]> {
    return await db
      .select()
      .from(roleData)
      .where(eq(roleData.userId, userId));
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username));
    return !user;
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    return !user;
  }
}

export const storage = new DatabaseStorage();
