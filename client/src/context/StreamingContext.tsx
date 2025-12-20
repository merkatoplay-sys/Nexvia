import React, { createContext, useContext, useState, ReactNode } from 'react';
import { addDays, subDays, isBefore, isAfter, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export type ServiceType = 'Netflix' | 'Spotify' | 'Disney+' | 'Crunchyroll' | 'HBO Max' | 'Prime Video' | 'YouTube Premium';

/**
 * Obtiene el máximo número de perfiles permitidos por servicio
 */
const getMaxProfilesByService = (serviceName: ServiceType): number => {
  const limits: Record<ServiceType, number> = {
    'Netflix': 5,
    'Spotify': 7,
    'Disney+': 7,
    'Crunchyroll': 7,
    'HBO Max': 7,
    'Prime Video': 7,
    'YouTube Premium': 7,
  };
  return limits[serviceName] || 7;
};

/**
 * Valida que el número de perfiles no exceda el límite del servicio
 */
const validateProfileCount = (serviceName: ServiceType, profileCount: number): { valid: boolean; message?: string } => {
  const max = getMaxProfilesByService(serviceName);
  if (profileCount > max) {
    return {
      valid: false,
      message: `${serviceName} permite un máximo de ${max} perfiles. Intentaste crear ${profileCount}.`
    };
  }
  if (profileCount < 1) {
    return {
      valid: false,
      message: 'Debes tener al menos 1 perfil.'
    };
  }
  return { valid: true };
};

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
  type: 'renovación' | 'otro';
  accountId?: string;
  date: string;
}

interface StreamingContextType {
  accounts: Account[];
  clients: Client[];
  expenses: Expense[];
  addAccount: (account: Omit<Account, 'id' | 'status'>) => boolean;
  updateAccount: (id: string, updates: Partial<Account>) => boolean;
  deleteAccount: (id: string) => void;
  sellProfile: (accountId: string, profileId: string, clientData: { name: string; phone: string; pin?: string; price: number; endDate: string }) => boolean;
  addClient: (client: Omit<Client, 'id'>) => string;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  getStats: () => { totalSales: number; totalExpenses: number; netProfit: number; activeAccounts: number; expiringSoon: number };
  getMaxProfilesByService: (serviceName: ServiceType) => number;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

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
      { id: 'p1', name: 'Familia', phone: '+52 555 123 4567', clientId: 'c1', price: 5, status: 'activo', startDate: new Date().toISOString(), endDate: addDays(new Date(), 30).toISOString() },
      { id: 'p2', name: 'Trabajo', phone: '+52 555 987 6543', clientId: 'c2', price: 5, status: 'activo', startDate: new Date().toISOString(), endDate: addDays(new Date(), 30).toISOString() },
      { id: 'p3', name: 'Disponible', status: 'disponible' },
      { id: 'p4', name: 'Disponible', status: 'disponible' },
      { id: 'p5', name: 'Kids', status: 'disponible' },
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
    description: 'Renovación Netflix - Octubre',
    amount: 15,
    type: 'renovación',
    accountId: 'a1',
    date: subDays(new Date(), 5).toISOString()
  }
];

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);

  const addAccount = (newAccount: Omit<Account, 'id' | 'status'>) => {
    const validation = validateProfileCount(newAccount.serviceName, newAccount.totalProfiles);
    if (!validation.valid) {
      toast.error(validation.message);
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

    const serviceName = updates.serviceName || account.serviceName;
    const totalProfiles = updates.totalProfiles || account.totalProfiles;

    const validation = validateProfileCount(serviceName, totalProfiles);
    if (!validation.valid) {
      toast.error(validation.message);
      return false;
    }

    setAccounts(accounts.map(acc => (acc.id === id ? { ...acc, ...updates } : acc)));
    toast.success('Cuenta actualizada exitosamente');
    return true;
  };

  const deleteAccount = (id: string) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
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

  const sellProfile = (accountId: string, profileId: string, clientData: { name: string; phone: string; pin?: string; price: number; endDate: string }) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    // Buscar el perfil y verificar que esté disponible
    const profile = account.profiles.find(p => p.id === profileId);
    if (!profile) {
      toast.error('Perfil no encontrado');
      return false;
    }

    if (profile.status !== 'disponible') {
      toast.error('Este perfil no está disponible');
      return false;
    }

    // Crear o buscar cliente
    let clientId = '';
    const existingClient = clients.find(c => c.phone === clientData.phone);
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      clientId = addClient({ name: clientData.name, phone: clientData.phone });
    }

    // Actualizar el perfil
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
            startDate: new Date().toISOString(),
            endDate: clientData.endDate
          };
        })
      };
    });

    setAccounts(updatedAccounts);
    toast.success(`Perfil vendido a ${clientData.name}`);
    return true;
  };

  const getStats = () => {
    let totalSales = 0;
    let totalExpenses = 0;
    let activeAccounts = 0;
    let expiringSoon = 0;

    accounts.forEach(acc => {
      const activeProfiles = acc.profiles.filter(p => p.status === 'activo');
      activeProfiles.forEach(profile => {
        totalSales += profile.price || acc.pricePerProfile;
      });

      if (acc.status === 'activa') activeAccounts++;
      if (acc.status === 'por vencer') expiringSoon++;
    });

    expenses.forEach(exp => {
      totalExpenses += exp.amount;
    });

    return {
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      activeAccounts,
      expiringSoon
    };
  };

  return (
    <StreamingContext.Provider value={{ 
      accounts, 
      clients, 
      expenses,
      addAccount, 
      updateAccount, 
      deleteAccount, 
      sellProfile,
      addClient,
      addExpense,
      getStats,
      getMaxProfilesByService
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
