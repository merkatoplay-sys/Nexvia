import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth models (REQUIRED for Replit Auth)
export * from "./models/auth";

// Services table
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  maxProfiles: integer("max_profiles").notNull().default(7),
  isCustom: boolean("is_custom").notNull().default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Master accounts table
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  serviceName: text("service_name").notNull(),
  email: text("email").notNull(),
  password: text("password"),
  totalProfiles: integer("total_profiles").notNull(),
  startDate: timestamp("start_date").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  isRenewable: boolean("is_renewable").notNull().default(true),
  cost: real("cost").notNull(),

  // ⚠️ lo dejamos por compatibilidad (puedes no usarlo en UI)
  pricePerProfile: real("price_per_profile").notNull().default(0),

  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),

  // ✅ NUEVO: venta cuenta completa
  // "perfiles" | "cuenta"
  saleType: varchar("sale_type", { length: 20 }).notNull().default("perfiles"),
  soldClientId: varchar("sold_client_id"),
  soldStartDate: timestamp("sold_start_date"),
  soldEndDate: timestamp("sold_end_date"),
});

// Profiles table
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  pin: text("pin"),
  clientId: varchar("client_id"),
  price: real("price"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  profileId: varchar("profile_id"),
  accountId: varchar("account_id"),
  note: text("note"),
  reference: text("reference"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Settings table
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("USD"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  notificationChannel: varchar("notification_channel", { length: 20 }).notNull().default("telegram"),
  daysBeforeExpiry: integer("days_before_expiry").notNull().default(3),
  notificationTime: varchar("notification_time", { length: 5 }).notNull().default("09:00"),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  whatsappPhoneNumber: text("whatsapp_phone_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const accountsRelations = relations(accounts, ({ many }) => ({
  profiles: many(profiles),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  account: one(accounts, {
    fields: [profiles.accountId],
    references: [accounts.id],
  }),
}));

// Insert schemas
export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

/**
 * ✅ IMPORTANTE:
 * Hacemos opcional saleType y las fechas/cliente de venta
 * para que NO te obligue el frontend al crear cuenta.
 */
export const insertAccountSchema = createInsertSchema(accounts)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    saleType: z.enum(["perfiles", "cuenta"]).optional(),
    soldClientId: z.string().optional().nullable(),
    soldStartDate: z.coerce.date().optional().nullable(),
    soldEndDate: z.coerce.date().optional().nullable(),
  });

/**
 * ✅ Fechas opcionales en perfiles (por si llegan como string ISO)
 */
export const insertProfileSchema = createInsertSchema(profiles)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    startDate: z.coerce.date().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
  });

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    date: z.coerce.date(), // ✅ muy importante para expenses
  });

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
