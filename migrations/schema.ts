import { pgTable, unique, serial, varchar, text, integer, boolean, timestamp, foreignKey, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const captchas = pgTable("captchas", {
	id: serial().primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	question: text().notNull(),
	answer: varchar({ length: 50 }).notNull(),
	attempts: integer().default(0).notNull(),
	solved: boolean().default(false).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("captchas_session_id_unique").on(table.sessionId),
]);

export const otpAttempts = pgTable("otp_attempts", {
	id: serial().primaryKey().notNull(),
	identifier: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 10 }).notNull(),
	attempts: integer().default(0).notNull(),
	lastAttempt: timestamp("last_attempt", { mode: 'string' }),
	blockedUntil: timestamp("blocked_until", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }),
	username: varchar({ length: 50 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	countryCode: varchar("country_code", { length: 10 }).notNull(),
	isWhatsapp: boolean("is_whatsapp").default(false).notNull(),
	gender: varchar({ length: 20 }).notNull(),
	dateOfBirth: varchar("date_of_birth", { length: 10 }).notNull(),
	country: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 100 }).notNull(),
	city: varchar({ length: 100 }).notNull(),
	address: text(),
	password: text().notNull(),
	role: varchar({ length: 20 }),
	roleStatus: varchar("role_status", { length: 20 }).default('pending').notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	phoneVerified: boolean("phone_verified").default(false).notNull(),
	profilePicture: text("profile_picture"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);

export const roleData = pgTable("role_data", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	role: varchar({ length: 20 }).notNull(),
	data: json().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "role_data_user_id_users_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	sessionToken: varchar("session_token", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}),
	unique("sessions_session_token_unique").on(table.sessionToken),
]);
