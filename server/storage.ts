import { type User, type InsertUser, type Session, type InsertSession, type OtpAttempt, type InsertOtpAttempt, type RoleData, type InsertRoleData } from "@shared/schema";

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
      ...insertUser,
      id,
      emailVerified: false,
      phoneVerified: false,
      roleStatus: "pending",
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

export const storage = new MemStorage();
