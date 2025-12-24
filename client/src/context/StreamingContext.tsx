import React, { createContext, useContext, useState, ReactNode } from 'react';
import { addDays, subDays, isBefore, isAfter, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export type ServiceType = string;

export interface Service {
  id: string;
  name: string;
  color: string;
  maxProfiles: number;
  isCustom: boolean;
}

export interface Profile {
  id: string;
  name: string;
  phone?: string;
  pin?: string;
  clientId?: string;
  price?: number;
  startDate?: string;
  endDate?: string;
  status: 'activo' | 'vencido' | 'disponible';
}

export interface Account {
  id: string;
  serviceName: ServiceType;
  email: string;
  password?: string;
  totalProfiles: number;
  profiles: Profile[];
  startDate: string;
  expirationDate: string;
  isRenewable: boolean;
  cost: number;
  pricePerProfile: number;
  status: 'activa' | 'por vencer' | 'vencida';
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  notes?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  type: 'ganancia' | 'gasto';
  profileId?: string;
  accountId?: string;
  date: string;
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

interface StreamingContextType {
  accounts: Account[];
  clients: Client[];
  expenses: Expense[];
  services: Service[];
  settings: AppSettings;
  addAccount: (account: Omit<Account, 'id' | 'status'>) => boolean;
  updateAccount: (id: string, updates: Partial<Account>) => boolean;
  deleteAccount: (id: string) => void;
  sellProfile: (accountId: string, profileId: string, clientData: { name: string; phone: string; pin?: string; price: number; startDate: string; endDate: string }) => boolean;
  renewProfile: (accountId: string, profileId: string, renewalPrice: number) => boolean;
  renewAccount: (accountId: string) => boolean;
  updateProfile: (accountId: string, profileId: string, updates: Partial<Profile>) => boolean;
  addClient: (client: Omit<Client, 'id'>) => string;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addService: (service: Omit<Service, 'id'>) => boolean;
  updateService: (id: string, updates: Partial<Service>) => boolean;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getAllProfiles: () => Array<Profile & { accountId: string; accountName: string }>;
  getStats: () => { totalSales: number; totalExpenses: number; netProfit: number; activeAccounts: number; expiringSoon: number };
  getServiceColor: (serviceName: string) => string;
  getMaxProfilesByService: (serviceName: ServiceType) => number;
  deleteService: (id: string) => void;
  deleteProfile: (accountId: string, profileId: string) => void;
  sendTelegramTestNotification: (botToken: string, chatId: string) => Promise<boolean>;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

const DEFAULT_SERVICES: Service[] = [
  { id: 's1', name: 'Netflix', color: '#E50914', maxProfiles: 5, isCustom: false },
  { id: 's2', name: 'Spotify', color: '#1DB954', maxProfiles: 7, isCustom: false },
  { id: 's3', name: 'Disney+', color: '#0072F5', maxProfiles: 7, isCustom: false },
  { id: 's4', name: 'Prime Video', color: '#146EB4', maxProfiles: 7, isCustom: false },
  { id: 's5', name: 'HBO', color: '#000000', maxProfiles: 7, isCustom: false },
  { id: 's6', name: 'Crunchyroll', color: '#F47521', maxProfiles: 7, isCustom: false },
  { id: 's7', name: 'Vix', color: '#7B68EE', maxProfiles: 7, isCustom: false },
];

const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Juan Pérez', phone: '+52 555 123 4567' },
  { id: 'c2', name: 'Maria Lopez', phone: '+52 555 987 6543' },
  { id: 'c3', name: 'Carlos Ruiz', phone: '+52 555 111 2222' },
];

const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'a1',
    serviceName: 'Netflix',
    email: 'netflix.master@example.com',
    totalProfiles: 5,
    profiles: [
      { id: 'p1', name: 'Familia', phone: '+52 555 123 4567', clientId: 'c1', price: 5, status: 'activo', startDate: new Date().toISOString(), endDate: addDays(new Date(), 1).toISOString() },
      { id: 'p2', name: 'Trabajo', phone: '+52 555 987 6543', clientId: 'c2', price: 5, status: 'activo', startDate: new Date().toISOString(), endDate: addDays(new Date(), 30).toISOString() },
      { id: 'p3', name: 'Disponible', status: 'disponible' },
      { id: 'p4', name: 'Disponible', status: 'disponible' },
      { id: 'p5', name: 'Disponible', status: 'disponible' },
    ],
    startDate: new Date().toISOString(),
    expirationDate: addDays(new Date(), 25).toISOString(),
    isRenewable: true,
    cost: 15,
    pricePerProfile: 5,
    status: 'activa',
  },
  {
    id: 'a2',
    serviceName: 'Spotify',
    email: 'spotify.music@example.com',
    totalProfiles: 6,
    profiles: [
      { id: 'sp1', name: 'Principal', phone: '+52 555 111 2222', clientId: 'c3', price: 3, status: 'activo', startDate: subDays(new Date(), 10).toISOString(), endDate: addDays(new Date(), 20).toISOString() },
      { id: 'sp2', name: 'Disponible', status: 'disponible' },
      { id: 'sp3', name: 'Disponible', status: 'disponible' },
      { id: 'sp4', name: 'Disponible', status: 'disponible' },
      { id: 'sp5', name: 'Disponible', status: 'disponible' },
      { id: 'sp6', name: 'Disponible', status: 'disponible' },
    ],
    startDate: subDays(new Date(), 28).toISOString(),
    expirationDate: addDays(new Date(), 2).toISOString(),
    isRenewable: true,
    cost: 10,
    pricePerProfile: 3,
    status: 'por vencer',
  },
];

const MOCK_EXPENSES: Expense[] = [
  {
    id: 'e1',
    description: 'Venta de perfil Familia',
    amount: 5,
    type: 'ganancia',
    profileId: 'p1',
    accountId: 'a1',
    date: subDays(new Date(), 5).toISOString()
  },
  {
    id: 'e2',
    description: 'Renovación Netflix',
    amount: 15,
    type: 'gasto',
    accountId: 'a1',
    date: subDays(new Date(), 3).toISOString()
  }
];

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

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES.filter(s => s.name && s.name.trim()));
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const addAccount = (newAccount: Omit<Account, 'id' | 'status'>) => {
    const service = services.find(s => s.name === newAccount.serviceName);
    const maxProfiles = service?.maxProfiles || 7;
    
    if (newAccount.totalProfiles > maxProfiles) {
      toast.error(`${newAccount.serviceName} permite un máximo de ${maxProfiles} perfiles.`);
      return false;
    }

    const id = Math.random().toString(36).substr(2, 9);
    toast.success(`Cuenta ${newAccount.serviceName} agregada exitosamente`);
    setAccounts([...accounts, { ...newAccount, id, status: 'activa' }]);
    return true;
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    const account = accounts.find(acc => acc.id === id);
    if (!account) return false;
    setAccounts(accounts.map(acc => (acc.id === id ? { ...acc, ...updates } : acc)));
    toast.success('Cuenta actualizada exitosamente');
    return true;
  };

  const deleteAccount = (id: string) => {
    const accountToDelete = accounts.find(a => a.id === id);
    if (!accountToDelete) {
      toast.error('Cuenta no encontrada');
      return;
    }
    
    setAccounts(accounts.filter(acc => acc.id !== id));
    
    const profileIds = accountToDelete.profiles.map(p => p.id);
    setExpenses(expenses.filter(e => !profileIds.includes(e.profileId || '')));
    
    toast.success('Cuenta maestra y sus perfiles eliminados');
  };

  const addClient = (client: Omit<Client, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setClients([...clients, { ...client, id }]);
    return id;
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setExpenses([...expenses, { ...expense, id }]);
  };

  const addService = (service: Omit<Service, 'id'>) => {
    if (!service.name || !service.name.trim()) {
      toast.error('El nombre del servicio no puede estar vacío');
      return false;
    }
    if (services.some(s => s.name === service.name)) {
      toast.error('Este servicio ya existe');
      return false;
    }
    const id = Math.random().toString(36).substr(2, 9);
    setServices([...services, { ...service, id }]);
    toast.success(`Servicio "${service.name}" creado exitosamente`);
    return true;
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setServices(services.map(s => (s.id === id ? { ...s, ...updates } : s)));
    toast.success('Servicio actualizado exitosamente');
    return true;
  };

  const sellProfile = (accountId: string, profileId: string, clientData: { name: string; phone: string; pin?: string; price: number; startDate: string; endDate: string }) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    const profile = account.profiles.find(p => p.id === profileId);
    if (!profile || profile.status !== 'disponible') {
      toast.error('Este perfil no está disponible');
      return false;
    }

    let clientId = '';
    const existingClient = clients.find(c => c.phone === clientData.phone);
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      clientId = addClient({ name: clientData.name, phone: clientData.phone });
    }

    const updatedAccounts = accounts.map(acc => {
      if (acc.id !== accountId) return acc;
      return {
        ...acc,
        profiles: acc.profiles.map(p => {
          if (p.id !== profileId) return p;
          return {
            ...p,
            name: clientData.name,
            phone: clientData.phone,
            pin: clientData.pin,
            price: clientData.price,
            status: 'activo' as const,
            clientId,
            startDate: clientData.startDate,
            endDate: clientData.endDate
          };
        })
      };
    });

    setAccounts(updatedAccounts);
    addExpense({
      description: `Venta de perfil ${clientData.name}`,
      amount: clientData.price,
      type: 'ganancia',
      profileId,
      accountId,
      date: new Date().toISOString()
    });
    toast.success(`Perfil vendido a ${clientData.name}`);
    return true;
  };

  const renewProfile = (accountId: string, profileId: string, renewalPrice: number) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    const profile = account.profiles.find(p => p.id === profileId);
    if (!profile || profile.status !== 'activo') {
      toast.error('Este perfil no puede renovarse');
      return false;
    }

    const updatedAccounts = accounts.map(acc => {
      if (acc.id !== accountId) return acc;
      return {
        ...acc,
        profiles: acc.profiles.map(p => {
          if (p.id !== profileId) return p;
          return {
            ...p,
            endDate: addDays(new Date(p.endDate || new Date()), 30).toISOString(),
            price: renewalPrice
          };
        })
      };
    });

    setAccounts(updatedAccounts);
    addExpense({
      description: `Renovación ${profile.name} - ${account.serviceName}`,
      amount: renewalPrice,
      type: 'ganancia',
      profileId,
      accountId,
      date: new Date().toISOString()
    });
    toast.success(`Perfil renovado exitosamente`);
    return true;
  };

  const renewAccount = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    const newExpirationDate = addDays(new Date(account.expirationDate), 30).toISOString();
    
    const updatedAccounts = accounts.map(acc => {
      if (acc.id !== accountId) return acc;
      return {
        ...acc,
        expirationDate: newExpirationDate,
        status: 'activa' as const
      };
    });

    setAccounts(updatedAccounts);
    addExpense({
      description: `Renovación cuenta ${account.serviceName}`,
      amount: account.cost,
      type: 'gasto',
      accountId,
      date: new Date().toISOString()
    });
    
    toast.success(`Cuenta ${account.serviceName} renovada exitosamente`);
    return true;
  };

  const updateProfile = (accountId: string, profileId: string, updates: Partial<Profile>) => {
    const updatedAccounts = accounts.map(acc => {
      if (acc.id !== accountId) return acc;
      return {
        ...acc,
        profiles: acc.profiles.map(p => (p.id === profileId ? { ...p, ...updates } : p))
      };
    });
    setAccounts(updatedAccounts);
    toast.success('Perfil actualizado');
    return true;
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings({ ...settings, ...newSettings });
  };

  const getAllProfiles = () => {
    const allProfiles: Array<Profile & { accountId: string; accountName: string }> = [];
    accounts.forEach(account => {
      account.profiles.forEach(profile => {
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
      if (exp.type === 'ganancia') {
        totalSales += exp.amount;
      } else {
        totalExpenses += exp.amount;
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

  const deleteService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
    toast.success('Servicio eliminado');
  };

  const deleteProfile = (accountId: string, profileId: string) => {
    const updatedAccounts = accounts.map(acc => {
      if (acc.id !== accountId) return acc;
      return {
        ...acc,
        profiles: acc.profiles.filter(p => p.id !== profileId)
      };
    });
    setAccounts(updatedAccounts);
    toast.success('Perfil eliminado');
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

  return (
    <StreamingContext.Provider value={{ 
      accounts, 
      clients, 
      expenses,
      services,
      settings,
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
      sendTelegramTestNotification
    }}>
      {children}
    </StreamingContext.Provider>
  );
};

export const useStreaming = () => {
  const context = useContext(StreamingContext);
  if (!context) throw new Error('useStreaming must be used within a StreamingProvider');
  return context;
};
