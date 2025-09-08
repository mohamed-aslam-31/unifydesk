import { z } from "zod";
import { pgTable, serial, text, varchar, boolean, timestamp, integer, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Define PostgreSQL tables with Drizzle ORM
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  countryCode: varchar('country_code', { length: 10 }).notNull(),
  isWhatsApp: boolean('is_whatsapp').notNull().default(false),
  gender: varchar('gender', { length: 20 }).notNull(),
  dateOfBirth: varchar('date_of_birth', { length: 10 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  address: text('address'),
  password: text('password').notNull(),

  role: varchar('role', { length: 20 }),
  roleStatus: varchar('role_status', { length: 20 }).notNull().default('pending'),
  emailVerified: boolean('email_verified').notNull().default(false),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  profilePicture: text('profile_picture'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const otpAttempts = pgTable('otp_attempts', {
  id: serial('id').primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastAttempt: timestamp('last_attempt'),
  blockedUntil: timestamp('blocked_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const roleData = pgTable('role_data', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull(),
  data: json('data').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const captchas = pgTable('captchas', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  question: text('question').notNull(),
  answer: varchar('answer', { length: 50 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  solved: boolean('solved').notNull().default(false),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  roleData: many(roleData),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const roleDataRelations = relations(roleData, ({ one }) => ({
  user: one(users, {
    fields: [roleData.userId],
    references: [users.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type OtpAttempt = typeof otpAttempts.$inferSelect;
export type NewOtpAttempt = typeof otpAttempts.$inferInsert;
export type RoleData = typeof roleData.$inferSelect;
export type NewRoleData = typeof roleData.$inferInsert;
export type Captcha = typeof captchas.$inferSelect;
export type NewCaptcha = typeof captchas.$inferInsert;

// Insert schemas with Drizzle-Zod
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertOtpAttemptSchema = createInsertSchema(otpAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertRoleDataSchema = createInsertSchema(roleData).omit({
  id: true,
  createdAt: true,
});

export const insertCaptchaSchema = createInsertSchema(captchas).omit({
  id: true,
  createdAt: true,
});

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertOtpAttempt = z.infer<typeof insertOtpAttemptSchema>;
export type InsertRoleData = z.infer<typeof insertRoleDataSchema>;
export type InsertCaptcha = z.infer<typeof insertCaptchaSchema>;

// Validation schemas
export const signupSchema = z.object({
  firstName: z.string()
    .min(1, "Enter your First Name")
    .max(40, "First name must not exceed 40 characters")
    .regex(/^[a-zA-Z]+( [a-zA-Z]+)*$/, "First name can only contain letters and single spaces")
    .refine(val => !val.includes('  '), "No consecutive spaces allowed"),
  lastName: z.string()
    .max(60, "Last name must not exceed 60 characters")
    .regex(/^[a-zA-Z]*( [a-zA-Z]+)*$/, "Last name can only contain letters and single spaces")
    .refine(val => !val || !val.includes('  '), "No consecutive spaces allowed")
    .optional()
    .or(z.literal("")),
  username: z.string()
    .min(1, "Enter your Username")
    .min(3, "Username must be at least 3 characters")
    .max(15, "Username must not exceed 15 characters")
    .regex(/^[a-zA-Z0-9_!@#$%^&*(),.?":{}|<>-]+$/, "Username cannot contain spaces"),
  email: z.string().min(1, "Enter Your Email").email("Enter a valid email address"),
  phone: z.string().min(1, "Enter your phone number").min(10, "Phone number must be at least 10 digits"),
  countryCode: z.string().min(1, "Country code is required"),
  isWhatsApp: z.boolean().default(false),
  gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
    required_error: "Please select your gender"
  }),
  dateOfBirth: z.string().min(1, "Select your Date of Birth").refine((date) => {
    const birth = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    return age >= 18;
  }, "You must be at least 18 years old"),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  address: z.string().min(1, "Address is required"),
  password: z.string()
    .min(1, "Enter the password")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Enter the confirm password"),
  captchaAnswer: z.string().optional(),
  captchaSessionId: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  })
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