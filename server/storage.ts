import { 
  services, accounts, profiles, clients, expenses, settings,
  type Service, type InsertService,
  type Account, type InsertAccount,
  type Profile, type InsertProfile,
  type Client, type InsertClient,
  type Expense, type InsertExpense,
  type Settings, type InsertSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Services
  getServices(userId: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, userId: string, updates: Partial<Service>): Promise<Service>;
  deleteService(id: string, userId: string): Promise<void>;

  // Accounts
  getAccounts(userId: string): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, userId: string, updates: Partial<Account>): Promise<Account>;
  deleteAccount(id: string, userId: string): Promise<void>;

  // Profiles
  getProfiles(userId: string): Promise<Profile[]>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, userId: string, updates: Partial<Profile>): Promise<Profile>;
  deleteProfile(id: string, userId: string): Promise<void>;

  // Clients
  getClients(userId: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;

  // Expenses
  getExpenses(userId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;

  // Settings
  getSettings(userId: string): Promise<Settings | null>;
  updateSettings(userId: string, updates: Partial<Settings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  // Services
  async getServices(userId: string): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(eq(services.userId, userId))
      .orderBy(desc(services.createdAt));
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db
      .insert(services)
      .values(service)
      .returning();
    return newService;
  }

  async updateService(id: string, userId: string, updates: Partial<Service>): Promise<Service> {
    const [updated] = await db
      .update(services)
      .set(updates)
      .where(and(eq(services.id, id), eq(services.userId, userId)))
      .returning();
    return updated;
  }

  async deleteService(id: string, userId: string): Promise<void> {
    await db
      .delete(services)
      .where(and(eq(services.id, id), eq(services.userId, userId)));
  }

  // Accounts
  async getAccounts(userId: string): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(desc(accounts.createdAt));
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db
      .insert(accounts)
      .values(account)
      .returning();
    return newAccount;
  }

  async updateAccount(id: string, userId: string, updates: Partial<Account>): Promise<Account> {
    const [updated] = await db
      .update(accounts)
      .set(updates)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteAccount(id: string, userId: string): Promise<void> {
    // Delete associated profiles and expenses first
    const accountProfiles = await db
      .select()
      .from(profiles)
      .where(eq(profiles.accountId, id));
    
    const profileIds = accountProfiles.map(p => p.id);
    
    // Delete expenses associated with profiles
    if (profileIds.length > 0) {
      for (const profileId of profileIds) {
        await db
          .delete(expenses)
          .where(eq(expenses.profileId, profileId));
      }
    }
    
    // Delete expenses associated with account
    await db
      .delete(expenses)
      .where(eq(expenses.accountId, id));
    
    // Delete profiles
    await db
      .delete(profiles)
      .where(eq(profiles.accountId, id));
    
    // Delete account
    await db
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  }

  // Profiles
  async getProfiles(userId: string): Promise<Profile[]> {
    return await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .orderBy(desc(profiles.createdAt));
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [newProfile] = await db
      .insert(profiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateProfile(id: string, userId: string, updates: Partial<Profile>): Promise<Profile> {
    const [updated] = await db
      .update(profiles)
      .set(updates)
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
      .returning();
    return updated;
  }

  async deleteProfile(id: string, userId: string): Promise<void> {
    // Delete associated expenses
    await db
      .delete(expenses)
      .where(eq(expenses.profileId, id));
    
    // Delete profile
    await db
      .delete(profiles)
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)));
  }

  // Clients
  async getClients(userId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(desc(clients.createdAt));
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }

  // Expenses
  async getExpenses(userId: string): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values(expense)
      .returning();
    return newExpense;
  }

  // Settings
  async getSettings(userId: string): Promise<Settings | null> {
    const [userSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId));
    
    // If no settings exist, create defaults
    if (!userSettings) {
      const [defaultSettings] = await db
        .insert(settings)
        .values({
          userId,
          defaultCurrency: 'USD',
          notificationsEnabled: true,
          notificationChannel: 'telegram',
          daysBeforeExpiry: 3,
          notificationTime: '09:00'
        })
        .returning();
      return defaultSettings;
    }
    
    return userSettings;
  }

  async updateSettings(userId: string, updates: Partial<Settings>): Promise<Settings> {
    const [updated] = await db
      .update(settings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(settings.userId, userId))
      .returning();
    
    // If no settings existed, create them
    if (!updated) {
      const [newSettings] = await db
        .insert(settings)
        .values({
          ...updates,
          userId,
        })
        .returning();
      return newSettings;
    }
    
    return updated;
  }
}

export const storage = new DatabaseStorage();
