import { int, json, mysqlEnum, mysqlTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import type { FoodKind, FeedbackType, UserPreferences } from "../shared/food";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userPreferences = mysqlTable("user_preferences", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  profile: json("profile").$type<Partial<UserPreferences>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const savedItems = mysqlTable("saved_items", {
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: varchar("itemId", { length: 100 }).notNull(),
  kind: mysqlEnum("kind", ["dish", "recipe"]).$type<FoodKind>().notNull(),
  savedAt: timestamp("savedAt").defaultNow().notNull(),
}, table => [primaryKey({ columns: [table.userId, table.itemId, table.kind] })]);

export const foodFeedback = mysqlTable("food_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: varchar("itemId", { length: 100 }).notNull(),
  feedback: mysqlEnum("feedback", ["love", "not_for_me", "too_expensive", "too_spicy", "similar"]).$type<FeedbackType>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
