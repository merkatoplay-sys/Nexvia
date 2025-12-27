import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import bcrypt from "bcryptjs";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(
    session({
      store: storage.sessionStore,
      secret: process.env.SESSION_SECRET || "streaming-manager-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "No autorizado" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ email, password: hashedPassword, role: "admin" });
      
      // Create default services for the user
      const defaultServices = [
        { name: 'Netflix', color: '#E50914', maxProfiles: 5, isCustom: false },
        { name: 'Spotify', color: '#1DB954', maxProfiles: 7, isCustom: false },
        { name: 'Disney+', color: '#0072F5', maxProfiles: 7, isCustom: false },
        { name: 'Prime Video', color: '#146EB4', maxProfiles: 7, isCustom: false },
        { name: 'HBO', color: '#000000', maxProfiles: 7, isCustom: false },
        { name: 'Crunchyroll', color: '#F47521', maxProfiles: 7, isCustom: false },
      ];
      
      for (const service of defaultServices) {
        await storage.createService({ ...service, userId: user.id });
      }

      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Error al registrar usuario" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Error al iniciar sesión" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener usuario" });
    }
  });

  // Services routes
  app.get("/api/services", requireAuth, async (req, res) => {
    try {
      const services = await storage.getServices(req.session.userId!);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener servicios" });
    }
  });

  app.post("/api/services", requireAuth, async (req, res) => {
    try {
      const service = await storage.createService({
        ...req.body,
        userId: req.session.userId!,
      });
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Error al crear servicio" });
    }
  });

  app.put("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const service = await storage.updateService(parseInt(req.params.id), req.body);
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar servicio" });
    }
  });

  app.delete("/api/services/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteService(parseInt(req.params.id));
      res.json({ message: "Servicio eliminado" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar servicio" });
    }
  });

  // Accounts routes
  app.get("/api/accounts", requireAuth, async (req, res) => {
    try {
      const accounts = await storage.getAccounts(req.session.userId!);
      const accountsWithProfiles = await Promise.all(
        accounts.map(async (account) => {
          const profiles = await storage.getProfilesByAccount(account.id);
          return { ...account, profiles };
        })
      );
      res.json(accountsWithProfiles);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener cuentas" });
    }
  });

  app.post("/api/accounts", requireAuth, async (req, res) => {
    try {
      const { totalProfiles, ...accountData } = req.body;
      const account = await storage.createAccount({
        ...accountData,
        totalProfiles,
        userId: req.session.userId!,
      });
      
      // Create empty profiles
      for (let i = 0; i < totalProfiles; i++) {
        await storage.createProfile({
          accountId: account.id,
          name: "Disponible",
          status: "disponible",
        });
      }
      
      const profiles = await storage.getProfilesByAccount(account.id);
      res.json({ ...account, profiles });
    } catch (error) {
      console.error("Create account error:", error);
      res.status(500).json({ message: "Error al crear cuenta" });
    }
  });

  app.put("/api/accounts/:id", requireAuth, async (req, res) => {
    try {
      const account = await storage.updateAccount(parseInt(req.params.id), req.body);
      const profiles = await storage.getProfilesByAccount(account.id);
      res.json({ ...account, profiles });
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar cuenta" });
    }
  });

  app.delete("/api/accounts/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAccount(parseInt(req.params.id));
      res.json({ message: "Cuenta eliminada" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar cuenta" });
    }
  });

  // Profiles routes
  app.get("/api/accounts/:accountId/profiles", requireAuth, async (req, res) => {
    try {
      const profiles = await storage.getProfilesByAccount(parseInt(req.params.accountId));
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener perfiles" });
    }
  });

  app.put("/api/profiles/:id", requireAuth, async (req, res) => {
    try {
      const profile = await storage.updateProfile(parseInt(req.params.id), req.body);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar perfil" });
    }
  });

  app.delete("/api/profiles/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteProfile(parseInt(req.params.id));
      res.json({ message: "Perfil eliminado" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar perfil" });
    }
  });

  // Clients routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getClients(req.session.userId!);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener clientes" });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const client = await storage.createClient({
        ...req.body,
        userId: req.session.userId!,
      });
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Error al crear cliente" });
    }
  });

  // Expenses routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expenses = await storage.getExpenses(req.session.userId!);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener gastos" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expense = await storage.createExpense({
        ...req.body,
        userId: req.session.userId!,
      });
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Error al crear gasto" });
    }
  });

  // Sell profile (combines client creation and profile update)
  app.post("/api/profiles/:id/sell", requireAuth, async (req, res) => {
    try {
      const { name, phone, pin, price, startDate, endDate } = req.body;
      
      // Find or create client
      let client = await storage.getClientByPhone(req.session.userId!, phone);
      if (!client) {
        client = await storage.createClient({
          userId: req.session.userId!,
          name,
          phone,
        });
      }
      
      // Update profile
      const profile = await storage.updateProfile(parseInt(req.params.id), {
        name,
        phone,
        pin,
        price,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        clientId: client.id,
        status: "activo",
      });
      
      // Create expense record
      await storage.createExpense({
        userId: req.session.userId!,
        description: `Venta de perfil ${name}`,
        amount: price,
        type: "ganancia",
        profileId: profile.id,
        date: new Date(),
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Sell profile error:", error);
      res.status(500).json({ message: "Error al vender perfil" });
    }
  });

  // Renew account (extends expiration date)
  app.post("/api/accounts/:id/renew", requireAuth, async (req, res) => {
    try {
      const { days, cost } = req.body;
      const account = await storage.getAccount(parseInt(req.params.id));
      
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      const currentExpiration = new Date(account.expirationDate);
      const newExpiration = new Date(currentExpiration.getTime() + days * 24 * 60 * 60 * 1000);
      
      const updatedAccount = await storage.updateAccount(account.id, {
        expirationDate: newExpiration,
        status: "activa",
      });
      
      // Record expense
      await storage.createExpense({
        userId: req.session.userId!,
        description: `Renovación cuenta ${account.serviceName}`,
        amount: cost,
        type: "gasto",
        accountId: account.id,
        date: new Date(),
        reference: `RENEW_ACCOUNT_${account.id}`,
      });
      
      const profiles = await storage.getProfilesByAccount(updatedAccount.id);
      res.json({ ...updatedAccount, profiles });
    } catch (error) {
      res.status(500).json({ message: "Error al renovar cuenta" });
    }
  });

  // Renew profile
  app.post("/api/profiles/:id/renew", requireAuth, async (req, res) => {
    try {
      const { days, price } = req.body;
      const profile = await storage.getProfile(parseInt(req.params.id));
      
      if (!profile || !profile.endDate) {
        return res.status(404).json({ message: "Perfil no encontrado" });
      }
      
      const currentEnd = new Date(profile.endDate);
      const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);
      
      const updatedProfile = await storage.updateProfile(profile.id, {
        endDate: newEnd,
        status: "activo",
      });
      
      // Record income
      await storage.createExpense({
        userId: req.session.userId!,
        description: `Renovación perfil ${profile.name}`,
        amount: price,
        type: "ganancia",
        profileId: profile.id,
        date: new Date(),
        reference: `RENEW_PROFILE_${profile.id}`,
      });
      
      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ message: "Error al renovar perfil" });
    }
  });

  // Process refund
  app.post("/api/refunds", requireAuth, async (req, res) => {
    try {
      const { profileId, amount, reason } = req.body;
      
      const expense = await storage.createExpense({
        userId: req.session.userId!,
        description: `Devolución: ${reason}`,
        amount,
        type: "gasto",
        profileId,
        date: new Date(),
        note: reason,
        reference: `REFUND_${profileId}`,
      });
      
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Error al procesar devolución" });
    }
  });

  return httpServer;
}
