import type { Express } from "express";
import { type Server } from "http";
import cookieParser from "cookie-parser";
import {
  isAuthenticated,
  getUserId,
  getUserByEmail,
  createUser,
  comparePassword,
  generateToken,
  toSafeUser,
  getUserById
} from "./auth";
import { storage } from "./storage";
import { insertUserSchema, loginSchema } from "@shared/schema";
import path from "path";
import fs from "fs";

// ✅ NUEVO
import { runExpiryNotifications } from "./notify";

function toDate(val: any): Date | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  if (val instanceof Date) return val;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

// ✅ normalizador
const norm = (v: any) => String(v ?? "").trim().toLowerCase();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: result.error.errors[0]?.message || "Datos inválidos"
        });
      }

      const { email, password, firstName, lastName } = result.data;

      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Este correo ya pertenece a una cuenta" });
      }

      const user = await createUser(email, password, firstName ?? undefined, lastName ?? undefined);
      const token = generateToken(user.id, user.email);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ user: toSafeUser(user), token });
    } catch (error) {
      console.error("Error en registro:", error);
      res.status(500).json({ message: "Error al registrar usuario" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: result.error.errors[0]?.message || "Datos inválidos"
        });
      }

      const { email, password } = result.data;

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "No existe una cuenta con este correo" });
      }

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      const token = generateToken(user.id, user.email);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ user: toSafeUser(user), token });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({ message: "Error al iniciar sesión" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Sesión cerrada" });
  });

  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await getUserById(userId);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      res.json(toSafeUser(user));
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      res.status(500).json({ message: "Error al obtener usuario" });
    }
  });

  // Services routes
  app.get("/api/services", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const services = await storage.getServices(userId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const service = await storage.createService({ ...req.body, userId });
      res.json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const service = await storage.updateService(req.params.id, userId, req.body);
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteService(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Service image upload endpoint
  app.post("/api/services/:id/image", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const serviceId = req.params.id;

      const { imageData } = req.body;
      if (!imageData) return res.status(400).json({ message: "No se proporcionó imagen" });

      const matches = imageData.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ message: "Formato de imagen no válido. Use PNG o JPG" });
      }

      const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      const uploadsDir = path.join(process.cwd(), "uploads", "services");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const filename = `${serviceId}-${Date.now()}.${extension}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, buffer);

      const imageUrl = `/uploads/services/${filename}`;
      const service = await storage.updateService(serviceId, userId, { imageUrl });

      res.json({ imageUrl, service });
    } catch (error) {
      console.error("Error uploading service image:", error);
      res.status(500).json({ message: "Error al subir imagen" });
    }
  });

  app.use("/uploads", (await import("express")).default.static(path.join(process.cwd(), "uploads")));

  // Accounts routes (incluye profiles)
  app.get("/api/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const [accountsList, profilesList] = await Promise.all([
        storage.getAccounts(userId),
        storage.getProfiles(userId),
      ]);

      const byAccount: Record<string, any[]> = {};
      for (const p of profilesList) {
        if (!p?.accountId) continue;
        if (!byAccount[p.accountId]) byAccount[p.accountId] = [];
        byAccount[p.accountId].push(p);
      }

      const accountsWithProfiles = accountsList.map(a => ({
        ...a,
        profiles: byAccount[a.id] ?? [],
      }));

      res.json(accountsWithProfiles);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  // ✅✅✅ NUEVO: Backfill de slots (crea perfiles disponibles faltantes)
  app.post("/api/accounts/backfill-slots", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const result = await storage.backfillAccountSlots(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error backfilling slots:", error);
      res.status(500).json({ message: error?.message || "Failed to backfill slots" });
    }
  });

  // ✅ Crear cuenta: valida servicio, guarda serviceId fijo y planName editable
  app.post("/api/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const startDate = toDate(req.body?.startDate) ?? new Date();
      const expirationDate =
        toDate(req.body?.expirationDate) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const servicesList = await storage.getServices(userId);

      const incomingServiceId = String(req.body?.serviceId ?? "").trim();
      const incomingServiceName = String(req.body?.serviceName ?? req.body?.service ?? "").trim();

      const svc =
        (incomingServiceId ? servicesList.find((s: any) => s.id === incomingServiceId) : null) ||
        (incomingServiceName ? servicesList.find((s: any) => norm(s.name) === norm(incomingServiceName)) : null);

      // ✅ Permitimos fallback por nombre (legacy), pero si no existe nada => error
      if (!svc && !incomingServiceName) {
        return res.status(400).json({ message: "Servicio inválido o no proporcionado" });
      }

      const planName = String(req.body?.planName ?? "").trim() || null;

      const account = await storage.createAccount({
        ...req.body,
        userId,
        startDate,
        expirationDate,

        // ✅ si existe servicio, lo fijamos bien
        serviceId: svc?.id ?? (req.body?.serviceId ?? null),
        serviceName: svc?.name ?? incomingServiceName,

        // ✅ plan editable
        planName,
      } as any);

      const cost = Number(req.body?.cost ?? 0);
      if (cost > 0) {
        const label = account.planName ? `${account.serviceName} - ${account.planName}` : account.serviceName;

        await storage.createExpense({
          userId,
          description: `Compra cuenta ${label} (${account.email})`,
          amount: cost,
          type: "gasto",
          accountId: account.id,
          profileId: null,
          date: new Date(),
          note: null,
          reference: "COMPRA_CUENTA",
        } as any);
      }

      res.json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // ✅ Update cuenta: bloquea cambio de servicio, permite planName
  app.patch("/api/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const accountId = req.params.id;

      const accountsList = await storage.getAccounts(userId);
      const current = accountsList.find(a => a.id === accountId);
      if (!current) return res.status(404).json({ message: "Cuenta no encontrada" });

      const updates: any = { ...req.body };
      if ("startDate" in updates) updates.startDate = toDate(updates.startDate);
      if ("expirationDate" in updates) updates.expirationDate = toDate(updates.expirationDate);
      if ("soldStartDate" in updates) updates.soldStartDate = toDate(updates.soldStartDate);
      if ("soldEndDate" in updates) updates.soldEndDate = toDate(updates.soldEndDate);

      // ✅ Normaliza planName (editable)
      if ("planName" in updates) {
        const pn = String(updates.planName ?? "").trim();
        updates.planName = pn ? pn : null;
      }

      // ✅ Bloqueo de servicio:
      // - si ya tiene serviceId => NO permitir cambiar serviceId/serviceName
      // - si NO tiene serviceId (legacy) => permitir setear serviceId UNA VEZ y normalizar serviceName
      const wantsServiceId = String(updates.serviceId ?? "").trim();

      if (current.serviceId) {
        delete updates.serviceId;
        delete updates.serviceName;
      } else {
        if (wantsServiceId) {
          const servicesList = await storage.getServices(userId);
          const svc = servicesList.find((s: any) => s.id === wantsServiceId);
          if (!svc) return res.status(400).json({ message: "Servicio inválido" });

          updates.serviceId = svc.id;
          updates.serviceName = svc.name;
        } else {
          // no aceptamos "inventar" serviceName en updates
          delete updates.serviceName;
        }
      }

      const account = await storage.updateAccount(accountId, userId, updates);
      res.json(account);
    } catch (error) {
      console.error("Error updating account:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  // Vender CUENTA COMPLETA
  app.post("/api/accounts/:id/sell", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const accountId = req.params.id;

      const { name, phone, pin, price, startDate, endDate } = req.body ?? {};

      if (!name || !phone || !price || !startDate || !endDate) {
        return res.status(400).json({ message: "Datos incompletos para vender cuenta" });
      }

      const start = toDate(startDate);
      const end = toDate(endDate);
      if (!start || !end) return res.status(400).json({ message: "Fechas inválidas" });

      const accountsList = await storage.getAccounts(userId);
      const account = accountsList.find(a => a.id === accountId);
      if (!account) return res.status(404).json({ message: "Cuenta no encontrada" });

      const allClients = await storage.getClients(userId);
      let client = allClients.find(c => c.phone === phone);
      if (!client) {
        client = await storage.createClient({ userId, name, phone, notes: null } as any);
      }

      await storage.updateAccount(accountId, userId, {
        saleType: "cuenta",
        soldClientId: client.id,
        soldStartDate: start,
        soldEndDate: end,
      } as any);

      const allProfiles = await storage.getProfiles(userId);
      const accountProfiles = allProfiles.filter(p => p.accountId === accountId);

      for (const p of accountProfiles) {
        await storage.updateProfile(p.id, userId, {
          status: "activo",
          clientId: client.id,
          name,
          phone,
          pin: pin || null,
          startDate: start,
          endDate: end,
          price: null,
        } as any);
      }

      await storage.createExpense({
        userId,
        description: `Venta cuenta completa - ${account.serviceName} - ${name}`,
        amount: Number(price),
        type: "ganancia",
        accountId,
        profileId: null,
        date: new Date(),
        note: `Cliente: ${name} (${phone})`,
        reference: "VENTA_CUENTA",
      } as any);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error selling full account:", error);
      res.status(500).json({ message: error?.message || "Failed to sell account" });
    }
  });

  // ✅ DELETE cuenta = ARCHIVAR
  app.delete("/api/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteAccount(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting(account archive):", error);
      res.status(500).json({ message: "Failed to archive account" });
    }
  });

  // Profiles routes
  app.get("/api/profiles", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profiles = await storage.getProfiles(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  // mover perfiles
  app.post("/api/profiles/move", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { fromAccountId, toAccountId, profileIds } = req.body as {
        fromAccountId: string;
        toAccountId: string;
        profileIds: string[];
      };

      if (!fromAccountId || !toAccountId || !Array.isArray(profileIds) || profileIds.length === 0) {
        return res.status(400).json({ message: "Datos incompletos para mover perfiles" });
      }

      const result = await storage.moveProfiles(userId, fromAccountId, toAccountId, profileIds);
      res.json(result);
    } catch (error: any) {
      console.error("Error moving profiles:", error);
      res.status(500).json({ message: error?.message || "Failed to move profiles" });
    }
  });

  // Create profile
  app.post("/api/profiles", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const body: any = { ...req.body };
      if ("startDate" in body) body.startDate = toDate(body.startDate);
      if ("endDate" in body) body.endDate = toDate(body.endDate);

      const profile = await storage.createProfile({ ...body, userId });
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  // Update profile
  app.patch("/api/profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const updates: any = { ...req.body };
      if ("startDate" in updates) updates.startDate = toDate(updates.startDate) ?? null;
      if ("endDate" in updates) updates.endDate = toDate(updates.endDate) ?? null;

      const profile = await storage.updateProfile(req.params.id, userId, updates);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.delete("/api/profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteProfile(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting profile:", error);
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  // Clients routes
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const client = await storage.createClient({ ...req.body, userId });
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Expenses routes
  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const expenses = await storage.getExpenses(userId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const body: any = { ...req.body };
      body.date = toDate(body.date) ?? new Date();

      const expense = await storage.createExpense({ ...body, userId });
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  // ✅ NUEVO: anular movimiento
  app.patch("/api/expenses/:id/void", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const reason = String(req.body?.reason ?? "").trim();

      await storage.voidExpense(req.params.id, userId, reason || undefined);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error voiding expense:", error);
      res.status(500).json({ message: error?.message || "Failed to void expense" });
    }
  });

  // Settings routes
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const settings = await storage.getSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // ✅ PATCH settings: moneda fija USD (ignora cualquier moneda entrante)
  app.patch("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const payload = {
        ...req.body,
        defaultCurrency: "USD",
      };

      const settings = await storage.updateSettings(userId, payload);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // ✅✅✅ NUEVO: Endpoint para cron de notificaciones Telegram
  // GET /api/cron/notify?secret=TU_SECRETO
  app.get("/api/cron/notify", async (req, res) => {
    const secret = String(req.query.secret || "");
    const expected = process.env.CRON_SECRET || "";

    if (!expected) return res.status(500).json({ message: "CRON_SECRET no configurado" });
    if (secret !== expected) return res.status(401).json({ message: "No autorizado" });

    try {
      const result = await runExpiryNotifications();
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ ok: false, message: err?.message || "Error" });
    }
  });

  return httpServer;
}
