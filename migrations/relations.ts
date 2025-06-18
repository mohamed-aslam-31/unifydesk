import { relations } from "drizzle-orm/relations";
import { users, roleData, sessions } from "./schema";

export const roleDataRelations = relations(roleData, ({one}) => ({
	user: one(users, {
		fields: [roleData.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	roleData: many(roleData),
	sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));