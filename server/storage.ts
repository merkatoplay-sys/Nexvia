import {
  services,
  accounts,
  profiles,
  clients,
  expenses,
  settings,
  type Service,
  type InsertService,
  type Account,
  type InsertAccount,
  type Profile,
  type InsertProfile,
  type Client,
  type InsertClient,
  type Expense,
  type InsertExpense,
  type Settings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

/**
 * Drizzle timestamp necesita Date.
 * Convierte string/number -> Date. Date se queda igual.
 * Si inválido -> null.
 */
function toDateOrNull(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value;

  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  return null;
}

export interface IStorage {
  // Services
  getServices(userId: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, userId: string, updates: Partial<Service>): Promise<Service>;
  deleteService(id: string, userId: string): Promise<void>;
  initializeDefaultServices(userId: string): Promise<void>;

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

  // Move Profiles ✅
  moveProfiles(
    userId: string,
    fromAccountId: string,
    toAccountId: string,
    profileIds: string[]
  ): Promise<{ moved: number }>;

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
    const userServices = await db
      .select()
      .from(services)
      .where(eq(services.userId, userId))
      .orderBy(desc(services.createdAt));

    if (userServices.length === 0) {
      await this.initializeDefaultServices(userId);
      return await db
        .select()
        .from(services)
        .where(eq(services.userId, userId))
        .orderBy(desc(services.createdAt));
    }

    return userServices;
  }

  async initializeDefaultServices(userId: string): Promise<void> {
    const defaultServices = [
      { userId, name: "Netflix", color: "#E50914", maxProfiles: 5, isCustom: false },
      { userId, name: "Spotify", color: "#1DB954", maxProfiles: 7, isCustom: false },
      { userId, name: "Disney+", color: "#0072F5", maxProfiles: 7, isCustom: false },
      { userId, name: "Prime Video", color: "#146EB4", maxProfiles: 7, isCustom: false },
      { userId, name: "HBO", color: "#000000", maxProfiles: 7, isCustom: false },
      { userId, name: "Crunchyroll", color: "#F47521", maxProfiles: 7, isCustom: false },
      { userId, name: "Vix", color: "#7B68EE", maxProfiles: 7, isCustom: false },
    ];

    await db.insert(services).values(defaultServices);
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
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
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.userId, userId)));

    if (!service) return;

    const serviceAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.serviceName, service.name), eq(accounts.userId, userId)));

    for (const account of serviceAccounts) {
      await this.deleteAccount(account.id, userId);
    }

    await db.delete(services).where(and(eq(services.id, id), eq(services.userId, userId)));
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
    const payload: any = { ...account };

    // ✅ startDate / expirationDate son NOT NULL -> fallback si vienen mal
    if ("startDate" in payload) payload.startDate = toDateOrNull(payload.startDate) ?? new Date();
    if ("expirationDate" in payload) payload.expirationDate = toDateOrNull(payload.expirationDate) ?? new Date();

    // Campos opcionales nuevos
    if ("soldStartDate" in payload) payload.soldStartDate = toDateOrNull(payload.soldStartDate);
    if ("soldEndDate" in payload) payload.soldEndDate = toDateOrNull(payload.soldEndDate);

    const [newAccount] = await db.insert(accounts).values(payload).returning();
    return newAccount;
  }

  async updateAccount(id: string, userId: string, updates: Partial<Account>): Promise<Account> {
    const payload: any = { ...updates };

    // ✅ no seteamos null en NOT NULL; si viene inválido, lo quitamos
    if ("startDate" in payload) {
      const d = toDateOrNull(payload.startDate);
      if (d) payload.startDate = d;
      else delete payload.startDate;
    }
    if ("expirationDate" in payload) {
      const d = toDateOrNull(payload.expirationDate);
      if (d) payload.expirationDate = d;
      else delete payload.expirationDate;
    }

    // ✅ opcionales
    if ("soldStartDate" in payload) payload.soldStartDate = toDateOrNull(payload.soldStartDate);
    if ("soldEndDate" in payload) payload.soldEndDate = toDateOrNull(payload.soldEndDate);

    const [updated] = await db
      .update(accounts)
      .set(payload)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();

    return updated;
  }

  async deleteAccount(id: string, userId: string): Promise<void> {
    // ✅ IMPORTANTE: NO BORRAR expenses (para no restar tu contabilidad)
    // Solo borramos perfiles y cuenta. Los movimientos financieros quedan registrados.

    await db.delete(profiles).where(eq(profiles.accountId, id));
    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
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
    const payload: any = { ...profile };
    if ("startDate" in payload) payload.startDate = toDateOrNull(payload.startDate);
    if ("endDate" in payload) payload.endDate = toDateOrNull(payload.endDate);

    const [newProfile] = await db.insert(profiles).values(payload).returning();
    return newProfile;
  }

  async updateProfile(id: string, userId: string, updates: Partial<Profile>): Promise<Profile> {
    const payload: any = { ...updates };
    if ("startDate" in payload) payload.startDate = toDateOrNull(payload.startDate);
    if ("endDate" in payload) payload.endDate = toDateOrNull(payload.endDate);

    const [updated] = await db
      .update(profiles)
      .set(payload)
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
      .returning();

    return updated;
  }

  async deleteProfile(id: string, userId: string): Promise<void> {
    // ✅ Igual: NO borramos expenses (para no restar contabilidad)
    await db.delete(profiles).where(and(eq(profiles.id, id), eq(profiles.userId, userId)));
  }

  // Move Profiles ✅
  async moveProfiles(
    userId: string,
    fromAccountId: string,
    toAccountId: string,
    profileIds: string[]
  ): Promise<{ moved: number }> {
    if (!profileIds?.length) return { moved: 0 };

    const [fromAccount] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, fromAccountId), eq(accounts.userId, userId)));

    const [toAccount] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, toAccountId), eq(accounts.userId, userId)));

    if (!fromAccount) throw new Error("Cuenta origen no encontrada");
    if (!toAccount) throw new Error("Cuenta destino no encontrada");

    if (fromAccount.serviceName !== toAccount.serviceName) {
      throw new Error("No puedes mover perfiles entre servicios distintos");
    }

    const profilesToMove = await db
      .select()
      .from(profiles)
      .where(
        and(
          eq(profiles.userId, userId),
          eq(profiles.accountId, fromAccountId),
          inArray(profiles.id, profileIds),
          eq(profiles.status, "activo"),
        )
      )
      .orderBy(desc(profiles.createdAt));

    if (profilesToMove.length === 0) return { moved: 0 };

    const destAvailable = await db
      .select()
      .from(profiles)
      .where(
        and(
          eq(profiles.userId, userId),
          eq(profiles.accountId, toAccountId),
          eq(profiles.status, "disponible"),
        )
      )
      .orderBy(desc(profiles.createdAt));

    if (destAvailable.length < profilesToMove.length) {
      throw new Error(
        `La cuenta destino solo tiene ${destAvailable.length} slots disponibles y quieres mover ${profilesToMove.length}`
      );
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < profilesToMove.length; i++) {
        const src = profilesToMove[i];
        const dstSlot = destAvailable[i];

        // llenar slot destino
        await tx
          .update(profiles)
          .set({
            name: src.name,
            phone: src.phone,
            pin: src.pin,
            clientId: src.clientId,
            price: src.price,
            startDate: src.startDate,
            endDate: src.endDate,
            status: "activo",
          })
          .where(and(eq(profiles.id, dstSlot.id), eq(profiles.userId, userId)));

        // limpiar origen
        await tx
          .update(profiles)
          .set({
            name: "Disponible",
            phone: null,
            pin: null,
            clientId: null,
            price: null,
            startDate: null,
            endDate: null,
            status: "disponible",
          })
          .where(and(eq(profiles.id, src.id), eq(profiles.userId, userId)));
      }
    });

    return { moved: profilesToMove.length };
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
    const [newClient] = await db.insert(clients).values(client).returning();
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
    const payload: any = { ...expense };
    if ("date" in payload) payload.date = toDateOrNull(payload.date) ?? new Date();
    else payload.date = new Date();

    const [newExpense] = await db.insert(expenses).values(payload).returning();
    return newExpense;
  }

  // Settings
  async getSettings(userId: string): Promise<Settings | null> {
    const [userSettings] = await db.select().from(settings).where(eq(settings.userId, userId));

    if (!userSettings) {
      const [defaultSettings] = await db
        .insert(settings)
        .values({
          userId,
          defaultCurrency: "USD",
          notificationsEnabled: true,
          notificationChannel: "telegram",
          daysBeforeExpiry: 3,
          notificationTime: "09:00",
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

    if (!updated) {
      const [newSettings] = await db
        .insert(settings)
        .values({ ...updates, userId } as any)
        .returning();
      return newSettings;
    }

    return updated;
  }
}

export const storage = new DatabaseStorage();
