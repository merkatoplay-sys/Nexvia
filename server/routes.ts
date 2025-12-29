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
  getUserById,
} from "./auth";
import { storage } from "./storage";
import { insertUserSchema, loginSchema } from "@shared/schema";
import path from "path";
import fs from "fs";

// ✅ Helpers: convierten strings/valores del front a tipos que Drizzle/Postgres esperan
function toDate(value: any): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function toNumber(value: any, fallback: number = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(cookieParser());

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: result.error.errors[0]?.message || "Datos inválidos",
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
          message: result.error.errors[0]?.message || "Datos inválidos",
        });
      }

      const { email, password } = result.data;

      const user = await getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "No existe una cuenta con este correo" });

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) return res.status(401).json({ message: "Contraseña incorrecta" });

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

      const payload = {
        ...req.body,
        userId,
        maxProfiles: toNumber(req.body?.maxProfiles, 7),
      };

      const service = await storage.createService(payload);
      res.json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const updates = {
        ...req.body,
        ...(req.body?.maxProfiles !== undefined ? { maxProfiles: toNumber(req.body.maxProfiles, 7) } : {}),
      };

      const service = await storage.updateService(req.params.id, userId, updates);
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

  // Accounts routes
  app.get("/api/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const accounts = await storage.getAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      // ✅ Convertimos timestamps a Date y números a number
      const startDate = toDate(req.body?.startDate) ?? new Date();
      const expirationDate =
        toDate(req.body?.expirationDate) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const payload = {
        ...req.body,
        userId,
        totalProfiles: toNumber(req.body?.totalProfiles, 5),
        cost: toNumber(req.body?.cost, 0),
        pricePerProfile: toNumber(req.body?.pricePerProfile, 0),
        startDate,
        expirationDate,
        status: req.body?.status || "activa",
      };

      const account = await storage.createAccount(payload);
      res.json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.patch("/api/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const updates: any = { ...req.body };

      if (updates.totalProfiles !== undefined) updates.totalProfiles = toNumber(updates.totalProfiles, 5);
      if (updates.cost !== undefined) updates.cost = toNumber(updates.cost, 0);
      if (updates.pricePerProfile !== undefined) updates.pricePerProfile = toNumber(updates.pricePerProfile, 0);

      if (updates.startDate !== undefined) updates.startDate = toDate(updates.startDate);
      if (updates.expirationDate !== undefined) updates.expirationDate = toDate(updates.expirationDate);

      const account = await storage.updateAccount(req.params.id, userId, updates);
      res.json(account);
    } catch (error) {
      console.error("Error updating account:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteAccount(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
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

  app.post("/api/profiles", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const payload = {
        ...req.body,
        userId,
        price: req.body?.price !== undefined ? toNumber(req.body.price, 0) : null,
        startDate: req.body?.startDate !== undefined ? toDate(req.body.startDate) : null,
        endDate: req.body?.endDate !== undefined ? toDate(req.body.endDate) : null,
      };

      const profile = await storage.createProfile(payload);
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.patch("/api/profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // se mantiene para consistencia, aunque storage valida por userId internamente

      const updates: any = { ...req.body };

      if (updates.price !== undefined) updates.price = updates.price === null ? null : toNumber(updates.price, 0);
      if (updates.startDate !== undefined) updates.startDate = updates.startDate === null ? null : toDate(updates.startDate);
      if (updates.endDate !== undefined) updates.endDate = updates.endDate === null ? null : toDate(updates.endDate);

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

      const payload = {
        ...req.body,
        userId,
        amount: toNumber(req.body?.amount, 0),
        date: toDate(req.body?.date) ?? new Date(),
      };

      const expense = await storage.createExpense(payload);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
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

  app.patch("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const settings = await storage.updateSettings(userId, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  return httpServer;
}
