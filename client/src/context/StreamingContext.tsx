import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { addDays } from 'date-fns';
import { toast } from 'sonner';

export type ServiceType = string;

export interface Service {
  id: number;
  name: string;
  color: string;
  maxProfiles: number;
  isCustom: boolean;
}

export interface Profile {
  id: number;
  accountId: number;
  name: string;
  phone?: string;
  pin?: string;
  clientId?: number;
  price?: string;
  startDate?: string;
  endDate?: string;
  status: 'activo' | 'vencido' | 'disponible';
}

export interface Account {
  id: number;
  serviceName: ServiceType;
  email: string;
  password?: string;
  totalProfiles: number;
  profiles: Profile[];
  startDate: string;
  expirationDate: string;
  isRenewable: boolean;
  cost: string;
  pricePerProfile: string;
  status: 'activa' | 'por vencer' | 'vencida';
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  notes?: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: string;
  type: 'ganancia' | 'gasto' | 'ajuste';
  profileId?: number;
  accountId?: number;
  date: string;
  note?: string;
  reference?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  channel: 'whatsapp' | 'telegram';
  daysBeforeExpiry: 1 | 2 | 3;
  notificationTime: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  whatsappPhoneNumber?: string;
}

export interface AppSettings {
  defaultCurrency: string;
  notifications: NotificationSettings;
}

export interface User {
  id: number;
  email: string;
  role: 'admin';
}

interface StreamingContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  accounts: Account[];
  clients: Client[];
  expenses: Expense[];
  services: Service[];
  settings: AppSettings;
  refreshData: () => Promise<void>;
  addAccount: (account: Omit<Account, 'id' | 'status' | 'profiles'>) => Promise<boolean>;
  updateAccount: (id: number, updates: Partial<Account>) => Promise<boolean>;
  deleteAccount: (id: number) => Promise<void>;
  sellProfile: (accountId: number, profileId: number, clientData: { name: string; phone: string; pin?: string; price: number; startDate: string; endDate: string }) => Promise<boolean>;
  renewProfile: (accountId: number, profileId: number, renewalPrice: number) => Promise<boolean>;
  renewAccount: (accountId: number) => Promise<boolean>;
  updateProfile: (accountId: number, profileId: number, updates: Partial<Profile>) => Promise<boolean>;
  addClient: (client: Omit<Client, 'id'>) => Promise<number>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addService: (service: Omit<Service, 'id'>) => Promise<boolean>;
  updateService: (id: number, updates: Partial<Service>) => Promise<boolean>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getAllProfiles: () => Array<Profile & { accountId: number; accountName: string }>;
  getStats: () => { totalSales: number; totalExpenses: number; netProfit: number; activeAccounts: number; expiringSoon: number };
  getServiceColor: (serviceName: string) => string;
  getMaxProfilesByService: (serviceName: ServiceType) => number;
  deleteService: (id: number) => Promise<void>;
  deleteProfile: (accountId: number, profileId: number) => Promise<void>;
  sendTelegramTestNotification: (botToken: string, chatId: string) => Promise<boolean>;
  renewAccountMaster: (accountId: number, renewalDays: number, cost: number) => Promise<boolean>;
  renewProfileSale: (accountId: number, profileId: number, renewalDays: number, cost: number) => Promise<boolean>;
  processRefund: (profileId: number, amount: number, reason: string) => Promise<boolean>;
  recordAdjustment: (description: string, amount: number, reference: string) => Promise<void>;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: 'USD',
  notifications: {
    enabled: true,
    channel: 'telegram',
    daysBeforeExpiry: 3,
    notificationTime: '09:00',
    telegramBotToken: '',
    telegramChatId: '',
    whatsappPhoneNumber: ''
  }
};

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de red' }));
    throw new Error(error.message || 'Error en la solicitud');
  }
  
  return response.json();
}

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const refreshData = useCallback(async () => {
    if (!user) return;
    
    try {
      const [accountsData, clientsData, expensesData, servicesData] = await Promise.all([
        apiRequest<Account[]>('/api/accounts'),
        apiRequest<Client[]>('/api/clients'),
        apiRequest<Expense[]>('/api/expenses'),
        apiRequest<Service[]>('/api/services'),
      ]);
      
      setAccounts(accountsData);
      setClients(clientsData);
      setExpenses(expensesData);
      setServices(servicesData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiRequest<{ user: User }>('/api/auth/me');
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiRequest<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiRequest<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      toast.success('Cuenta creada exitosamente');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar');
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccounts([]);
      setClients([]);
      setExpenses([]);
      setServices([]);
    }
  };

  const addAccount = async (newAccount: Omit<Account, 'id' | 'status' | 'profiles'>): Promise<boolean> => {
    const service = services.find(s => s.name === newAccount.serviceName);
    const maxProfiles = service?.maxProfiles || 7;
    
    if (newAccount.totalProfiles > maxProfiles) {
      toast.error(`${newAccount.serviceName} permite un máximo de ${maxProfiles} perfiles.`);
      return false;
    }

    try {
      const account = await apiRequest<Account>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(newAccount),
      });
      setAccounts(prev => [...prev, account]);
      toast.success(`Cuenta ${newAccount.serviceName} agregada exitosamente`);
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al crear cuenta');
      return false;
    }
  };

  const updateAccount = async (id: number, updates: Partial<Account>): Promise<boolean> => {
    try {
      const account = await apiRequest<Account>(`/api/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setAccounts(prev => prev.map(acc => (acc.id === id ? account : acc)));
      toast.success('Cuenta actualizada exitosamente');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar cuenta');
      return false;
    }
  };

  const deleteAccount = async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/accounts/${id}`, { method: 'DELETE' });
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      toast.success('Cuenta maestra y sus perfiles eliminados');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar cuenta');
    }
  };

  const addClient = async (client: Omit<Client, 'id'>): Promise<number> => {
    try {
      const newClient = await apiRequest<Client>('/api/clients', {
        method: 'POST',
        body: JSON.stringify(client),
      });
      setClients(prev => [...prev, newClient]);
      return newClient.id;
    } catch (error) {
      console.error('Error adding client:', error);
      return 0;
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>): Promise<void> => {
    try {
      const newExpense = await apiRequest<Expense>('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expense),
      });
      setExpenses(prev => [...prev, newExpense]);
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const addService = async (service: Omit<Service, 'id'>): Promise<boolean> => {
    if (!service.name || !service.name.trim()) {
      toast.error('El nombre del servicio no puede estar vacío');
      return false;
    }
    if (services.some(s => s.name === service.name)) {
      toast.error('Este servicio ya existe');
      return false;
    }
    
    try {
      const newService = await apiRequest<Service>('/api/services', {
        method: 'POST',
        body: JSON.stringify(service),
      });
      setServices(prev => [...prev, newService]);
      toast.success(`Servicio "${service.name}" creado exitosamente`);
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al crear servicio');
      return false;
    }
  };

  const updateService = async (id: number, updates: Partial<Service>): Promise<boolean> => {
    try {
      const service = await apiRequest<Service>(`/api/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setServices(prev => prev.map(s => (s.id === id ? service : s)));
      toast.success('Servicio actualizado exitosamente');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar servicio');
      return false;
    }
  };

  const deleteService = async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/services/${id}`, { method: 'DELETE' });
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success('Servicio eliminado');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar servicio');
    }
  };

  const sellProfile = async (accountId: number, profileId: number, clientData: { name: string; phone: string; pin?: string; price: number; startDate: string; endDate: string }): Promise<boolean> => {
    try {
      await apiRequest(`/api/profiles/${profileId}/sell`, {
        method: 'POST',
        body: JSON.stringify(clientData),
      });
      await refreshData();
      toast.success(`Perfil vendido a ${clientData.name}`);
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al vender perfil');
      return false;
    }
  };

  const renewProfile = async (accountId: number, profileId: number, renewalPrice: number): Promise<boolean> => {
    try {
      await apiRequest(`/api/profiles/${profileId}/renew`, {
        method: 'POST',
        body: JSON.stringify({ days: 30, price: renewalPrice }),
      });
      await refreshData();
      toast.success('Perfil renovado exitosamente');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al renovar perfil');
      return false;
    }
  };

  const renewAccount = async (accountId: number): Promise<boolean> => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    try {
      const updatedAccount = await apiRequest<Account>(`/api/accounts/${accountId}/renew`, {
        method: 'POST',
        body: JSON.stringify({ days: 30, cost: account.cost }),
      });
      setAccounts(prev => prev.map(acc => (acc.id === accountId ? updatedAccount : acc)));
      toast.success(`Cuenta ${account.serviceName} renovada exitosamente`);
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al renovar cuenta');
      return false;
    }
  };

  const updateProfile = async (accountId: number, profileId: number, updates: Partial<Profile>): Promise<boolean> => {
    try {
      await apiRequest(`/api/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      await refreshData();
      toast.success('Perfil actualizado');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar perfil');
      return false;
    }
  };

  const deleteProfile = async (accountId: number, profileId: number): Promise<void> => {
    try {
      await apiRequest(`/api/profiles/${profileId}`, { method: 'DELETE' });
      await refreshData();
      toast.success('Perfil eliminado');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar perfil');
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const getAllProfiles = () => {
    const allProfiles: Array<Profile & { accountId: number; accountName: string }> = [];
    accounts.forEach(account => {
      account.profiles?.forEach(profile => {
        if (profile.status !== 'disponible') {
          allProfiles.push({
            ...profile,
            accountId: account.id,
            accountName: account.serviceName
          });
        }
      });
    });
    return allProfiles;
  };

  const getStats = () => {
    let totalSales = 0;
    let totalExpenses = 0;
    let activeAccounts = 0;
    let expiringSoon = 0;

    expenses.forEach(exp => {
      const amount = parseFloat(exp.amount) || 0;
      if (exp.type === 'ganancia') {
        totalSales += amount;
      } else if (exp.type === 'gasto') {
        totalExpenses += amount;
      }
    });

    accounts.forEach(acc => {
      if (acc.status === 'activa') activeAccounts++;
      if (acc.status === 'por vencer') expiringSoon++;
    });

    return {
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      activeAccounts,
      expiringSoon
    };
  };

  const getServiceColor = (serviceName: string): string => {
    const service = services.find(s => s.name === serviceName);
    return service?.color || '#7B68EE';
  };

  const getMaxProfilesByService = (serviceName: ServiceType): number => {
    const service = services.find(s => s.name === serviceName);
    return service?.maxProfiles || 7;
  };

  const sendTelegramTestNotification = async (botToken: string, chatId: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✅ Notificación de prueba desde Streaming Manager\n\nSi ves este mensaje, tu configuración de Telegram es correcta.',
          parse_mode: 'HTML'
        })
      });
      
      if (response.ok) {
        toast.success('Notificación de prueba enviada a Telegram');
        return true;
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.description || 'No se pudo enviar la notificación'}`);
        return false;
      }
    } catch (error) {
      toast.error('Error al conectar con Telegram');
      return false;
    }
  };

  const renewAccountMaster = async (accountId: number, renewalDays: number, cost: number): Promise<boolean> => {
    try {
      const updatedAccount = await apiRequest<Account>(`/api/accounts/${accountId}/renew`, {
        method: 'POST',
        body: JSON.stringify({ days: renewalDays, cost }),
      });
      setAccounts(prev => prev.map(acc => (acc.id === accountId ? updatedAccount : acc)));
      toast.success(`Cuenta renovada por ${renewalDays} días`);
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al renovar cuenta');
      return false;
    }
  };

  const renewProfileSale = async (accountId: number, profileId: number, renewalDays: number, cost: number): Promise<boolean> => {
    try {
      await apiRequest(`/api/profiles/${profileId}/renew`, {
        method: 'POST',
        body: JSON.stringify({ days: renewalDays, price: cost }),
      });
      await refreshData();
      toast.success(`Perfil renovado por ${renewalDays} días`);
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al renovar perfil');
      return false;
    }
  };

  const processRefund = async (profileId: number, amount: number, reason: string): Promise<boolean> => {
    if (!profileId || amount <= 0) {
      toast.error('Datos inválidos para la devolución');
      return false;
    }

    try {
      await apiRequest('/api/refunds', {
        method: 'POST',
        body: JSON.stringify({ profileId, amount, reason }),
      });
      await refreshData();
      toast.success('Devolución registrada exitosamente');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar devolución');
      return false;
    }
  };

  const recordAdjustment = async (description: string, amount: number, reference: string): Promise<void> => {
    try {
      await addExpense({
        description: `Ajuste: ${description}`,
        amount: amount.toString(),
        type: 'ajuste',
        date: new Date().toISOString(),
        reference
      });
      toast.success('Ajuste registrado');
    } catch (error) {
      toast.error('Error al registrar ajuste');
    }
  };

  return (
    <StreamingContext.Provider value={{ 
      user,
      isLoading,
      login,
      register,
      logout,
      accounts, 
      clients, 
      expenses,
      services,
      settings,
      refreshData,
      addAccount, 
      updateAccount, 
      deleteAccount, 
      sellProfile,
      renewProfile,
      renewAccount,
      updateProfile,
      addClient,
      addExpense,
      addService,
      updateService,
      updateSettings,
      getAllProfiles,
      getStats,
      getServiceColor,
      getMaxProfilesByService,
      deleteService,
      deleteProfile,
      sendTelegramTestNotification,
      renewAccountMaster,
      renewProfileSale,
      processRefund,
      recordAdjustment
    }}>
      {children}
    </StreamingContext.Provider>
  );
};

export const useStreaming = () => {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error('useStreaming must be used within a StreamingProvider');
  }
  return context;
};
