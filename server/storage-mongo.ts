import bcrypt from 'bcryptjs';
import { User, Session, OtpAttempt, RoleData, InsertUser, InsertSession, InsertOtpAttempt, InsertRoleData } from '@shared/schema';
import { UserModel } from './models/User';
import { SessionModel } from './models/Session';
import { OtpAttemptModel } from './models/OtpAttempt';
import { RoleDataModel } from './models/RoleData';

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

export class MongoStorage implements IStorage {
  private currentUserId: number = 1;

  async getUser(id: number): Promise<User | undefined> {
    const user = await UserModel.findOne({ id }).exec();
    return user ? this.convertUserDocument(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email }).exec();
    return user ? this.convertUserDocument(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ username }).exec();
    return user ? this.convertUserDocument(user) : undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ firebaseUid }).exec();
    return user ? this.convertUserDocument(user) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate unique ID
    const lastUser = await UserModel.findOne().sort({ id: -1 }).exec();
    const id = lastUser ? (lastUser.id || 0) + 1 : 1;
    this.currentUserId = Math.max(this.currentUserId, id + 1);

    // Hash password
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);

    const userData = {
      ...insertUser,
      id,
      password: hashedPassword,
      emailVerified: false,
      phoneVerified: false,
      roleStatus: "pending",
    };

    const user = new UserModel(userData);
    await user.save();
    return this.convertUserDocument(user);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = await UserModel.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).exec();
    return user ? this.convertUserDocument(user) : undefined;
  }

  async createSession(session: InsertSession): Promise<Session> {
    // Generate unique ID
    const lastSession = await SessionModel.findOne().sort({ id: -1 }).exec();
    const id = lastSession ? (lastSession.id || 0) + 1 : 1;

    const sessionData = {
      ...session,
      id,
    };

    const newSession = new SessionModel(sessionData);
    await newSession.save();
    return this.convertSessionDocument(newSession);
  }

  async getSession(sessionToken: string): Promise<Session | undefined> {
    const session = await SessionModel.findOne({ sessionToken }).exec();
    if (session && session.expiresAt > new Date()) {
      return this.convertSessionDocument(session);
    }
    if (session) {
      await SessionModel.deleteOne({ sessionToken }).exec();
    }
    return undefined;
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await SessionModel.deleteOne({ sessionToken }).exec();
  }

  async getOtpAttempts(identifier: string, type: string): Promise<OtpAttempt | undefined> {
    const attempt = await OtpAttemptModel.findOne({ identifier, type }).exec();
    return attempt ? this.convertOtpAttemptDocument(attempt) : undefined;
  }

  async createOrUpdateOtpAttempts(attempt: InsertOtpAttempt): Promise<OtpAttempt> {
    const existing = await OtpAttemptModel.findOne({
      identifier: attempt.identifier,
      type: attempt.type
    }).exec();

    if (existing) {
      const updated = await OtpAttemptModel.findOneAndUpdate(
        { identifier: attempt.identifier, type: attempt.type },
        { 
          attempts: attempt.attempts || existing.attempts,
          lastAttempt: attempt.lastAttempt || existing.lastAttempt,
          blockedUntil: attempt.blockedUntil || existing.blockedUntil,
        },
        { new: true }
      ).exec();
      return this.convertOtpAttemptDocument(updated!);
    } else {
      // Generate unique ID
      const lastAttempt = await OtpAttemptModel.findOne().sort({ id: -1 }).exec();
      const id = lastAttempt ? (lastAttempt.id || 0) + 1 : 1;

      const otpData = {
        ...attempt,
        id,
      };

      const newAttempt = new OtpAttemptModel(otpData);
      await newAttempt.save();
      return this.convertOtpAttemptDocument(newAttempt);
    }
  }

  async createRoleData(roleDataInsert: InsertRoleData): Promise<RoleData> {
    // Generate unique ID
    const lastRoleData = await RoleDataModel.findOne().sort({ id: -1 }).exec();
    const id = lastRoleData ? (lastRoleData.id || 0) + 1 : 1;

    const data = {
      ...roleDataInsert,
      id,
    };

    const roleData = new RoleDataModel(data);
    await roleData.save();
    return this.convertRoleDataDocument(roleData);
  }

  async getRoleDataByUser(userId: number): Promise<RoleData[]> {
    const roleDataList = await RoleDataModel.find({ userId }).exec();
    return roleDataList.map(data => this.convertRoleDataDocument(data));
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const user = await UserModel.findOne({ username }).exec();
    return !user;
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const user = await UserModel.findOne({ email }).exec();
    return !user;
  }

  // Helper methods to convert Mongoose documents to plain objects
  private convertUserDocument(doc: any): User {
    return {
      _id: doc._id.toString(),
      id: doc.id,
      firstName: doc.firstName,
      lastName: doc.lastName,
      username: doc.username,
      email: doc.email,
      phone: doc.phone,
      countryCode: doc.countryCode,
      isWhatsApp: doc.isWhatsApp,
      gender: doc.gender,
      dateOfBirth: doc.dateOfBirth,
      country: doc.country,
      state: doc.state,
      city: doc.city,
      address: doc.address,
      password: doc.password,
      firebaseUid: doc.firebaseUid,
      role: doc.role,
      roleStatus: doc.roleStatus,
      emailVerified: doc.emailVerified,
      phoneVerified: doc.phoneVerified,
      profilePicture: doc.profilePicture,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private convertSessionDocument(doc: any): Session {
    return {
      _id: doc._id.toString(),
      id: doc.id,
      userId: doc.userId,
      sessionToken: doc.sessionToken,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    };
  }

  private convertOtpAttemptDocument(doc: any): OtpAttempt {
    return {
      _id: doc._id.toString(),
      id: doc.id,
      identifier: doc.identifier,
      type: doc.type,
      attempts: doc.attempts,
      lastAttempt: doc.lastAttempt,
      blockedUntil: doc.blockedUntil,
      createdAt: doc.createdAt,
    };
  }

  private convertRoleDataDocument(doc: any): RoleData {
    return {
      _id: doc._id.toString(),
      id: doc.id,
      userId: doc.userId,
      role: doc.role,
      data: doc.data,
      createdAt: doc.createdAt,
    };
  }
}

export const storage = new MongoStorage();