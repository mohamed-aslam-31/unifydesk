import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  countryCode: text("country_code").notNull(),
  isWhatsApp: boolean("is_whatsapp").default(false),
  gender: text("gender").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  country: text("country").notNull(),
  state: text("state").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  password: text("password").notNull(),
  firebaseUid: text("firebase_uid"),
  role: text("role"), // 'admin' | 'employee' | 'shopkeeper' | 'customer'
  roleStatus: text("role_status").default("pending"), // 'pending' | 'approved' | 'rejected'
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const otpAttempts = pgTable("otp_attempts", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(), // email or phone
  type: text("type").notNull(), // 'email' | 'phone'
  attempts: integer("attempts").default(0),
  lastAttempt: timestamp("last_attempt"),
  blockedUntil: timestamp("blocked_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roleData = pgTable("role_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  role: text("role").notNull(),
  data: jsonb("data").notNull(), // Store role-specific data
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  emailVerified: true,
  phoneVerified: true,
  roleStatus: true,
});

export const insertOtpAttemptSchema = createInsertSchema(otpAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertRoleDataSchema = createInsertSchema(roleData).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertOtpAttempt = z.infer<typeof insertOtpAttemptSchema>;
export type OtpAttempt = typeof otpAttempts.$inferSelect;

export type InsertRoleData = z.infer<typeof insertRoleDataSchema>;
export type RoleData = typeof roleData.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

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
