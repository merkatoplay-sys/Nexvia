import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin"] }).notNull().default("admin"),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  color: text("color").notNull(),
  maxProfiles: integer("max_profiles").notNull(),
  isCustom: boolean("is_custom").notNull().default(false),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  notes: text("notes"),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  serviceName: text("service_name").notNull(),
  email: text("email").notNull(),
  password: text("password"),
  totalProfiles: integer("total_profiles").notNull(),
  startDate: timestamp("start_date").notNull().defaultNow(),
  expirationDate: timestamp("expiration_date").notNull(),
  isRenewable: boolean("is_renewable").notNull().default(true),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  pricePerProfile: decimal("price_per_profile", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["activa", "por vencer", "vencida"] }).notNull().default("activa"),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  phone: text("phone"),
  pin: text("pin"),
  clientId: integer("client_id").references(() => clients.id),
  price: decimal("price", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status", { enum: ["activo", "vencido", "disponible"] }).notNull().default("disponible"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type", { enum: ["ganancia", "gasto", "ajuste"] }).notNull(),
  profileId: integer("profile_id").references(() => profiles.id),
  accountId: integer("account_id").references(() => accounts.id),
  date: timestamp("date").notNull().defaultNow(),
  note: text("note"),
  reference: text("reference"),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Service = typeof services.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
