import { pgTable, serial, varchar, boolean, timestamp, integer, text, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  countryCode: varchar('country_code', { length: 10 }).notNull(),
  isWhatsApp: boolean('is_whatsapp').default(false).notNull(),
  gender: varchar('gender', { length: 10 }).notNull(),
  dateOfBirth: varchar('date_of_birth', { length: 10 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  address: text('address'),
  password: varchar('password', { length: 255 }).notNull(),

  role: varchar('role', { length: 20 }),
  roleStatus: varchar('role_status', { length: 20 }).default('pending').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  phoneVerified: boolean('phone_verified').default(false).notNull(),
  profilePicture: varchar('profile_picture', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const otpAttempts = pgTable('otp_attempts', {
  id: serial('id').primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  type: varchar('type', { length: 10 }).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  lastAttempt: timestamp('last_attempt'),
  blockedUntil: timestamp('blocked_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const roleData = pgTable('role_data', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const captchas = pgTable('captchas', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  question: varchar('question', { length: 255 }).notNull(),
  answer: varchar('answer', { length: 255 }).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  solved: boolean('solved').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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