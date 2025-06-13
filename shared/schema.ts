import { z } from "zod";

// Define the user interface for MongoDB
export interface User {
  _id?: string;
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  countryCode: string;
  isWhatsApp: boolean;
  gender: string;
  dateOfBirth: string;
  country: string;
  state: string;
  city: string;
  address?: string;
  password: string;
  firebaseUid?: string;
  role?: string; // 'admin' | 'employee' | 'shopkeeper' | 'customer'
  roleStatus: string; // 'pending' | 'approved' | 'rejected'
  emailVerified: boolean;
  phoneVerified: boolean;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OtpAttempt {
  _id?: string;
  id?: number;
  identifier: string; // email or phone
  type: string; // 'email' | 'phone'
  attempts: number;
  lastAttempt?: Date;
  blockedUntil?: Date;
  createdAt: Date;
}

export interface RoleData {
  _id?: string;
  id?: number;
  userId: number;
  role: string;
  data: any; // Store role-specific data
  createdAt: Date;
}

export interface Session {
  _id?: string;
  id?: number;
  userId: number;
  sessionToken: string;
  expiresAt: Date;
  createdAt: Date;
}

// Insert types for creating new records
export type InsertUser = Omit<User, '_id' | 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'phoneVerified' | 'roleStatus'>;
export type InsertOtpAttempt = Omit<OtpAttempt, '_id' | 'id' | 'createdAt'>;
export type InsertRoleData = Omit<RoleData, '_id' | 'id' | 'createdAt'>;
export type InsertSession = Omit<Session, '_id' | 'id' | 'createdAt'>;

// Validation schemas
export const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  countryCode: z.string().min(1, "Country code is required"),
  isWhatsApp: z.boolean().default(false),
  gender: z.enum(["male", "female", "other", "prefer-not-to-say"]),
  dateOfBirth: z.string().refine((date) => {
    const birth = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    return age >= 18;
  }, "You must be at least 18 years old"),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  address: z.string().optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const adminRoleSchema = z.object({
  handlerType: z.enum(["owner", "accountant", "auditor"]),
  additionalInfo: z.string().optional(),
  profilePicture: z.string().optional(),
});

export const employeeRoleSchema = z.object({
  isNewEmployee: z.boolean(),
  experienceYears: z.number().optional(),
  lastShop: z.string().optional(),
  oldSalary: z.number().optional(),
  expectedSalary: z.number().optional(),
  education: z.string().optional(),
  guardianPhone: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  profilePicture: z.string().optional(),
});

export const shopkeeperRoleSchema = z.object({
  ownerName: z.string().min(2, "Owner name is required"),
  shopName: z.string().min(2, "Shop name is required"),
  yearsRunning: z.number().min(0, "Years running must be positive"),
  hasGSTIN: z.boolean(),
  gstinNumber: z.string().optional(),
  landline: z.string().optional(),
  isOldCustomer: z.boolean(),
});