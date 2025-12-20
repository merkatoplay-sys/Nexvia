import React, { createContext, useContext, useState, ReactNode } from 'react';
import { addDays, subDays, isBefore, isAfter, parseISO } from 'date-fns';

export type ServiceType = 'Netflix' | 'Spotify' | 'Disney+' | 'Crunchyroll' | 'HBO Max' | 'Prime Video' | 'YouTube Premium';

export interface Profile {
  id: string;
  name: string;
  pin?: string;
  clientId?: string;
  status: 'active' | 'expired' | 'empty';
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
  status: 'active' | 'expiring_soon' | 'expired';
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  notes?: string;
}

interface StreamingContextType {
  accounts: Account[];
  clients: Client[];
  addAccount: (account: Omit<Account, 'id' | 'status'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  assignProfile: (accountId: string, profileId: string, clientId: string) => void;
  addClient: (client: Omit<Client, 'id'>) => string;
  getStats: () => { totalSales: number; totalCost: number; netProfit: number; activeAccounts: number; expiringSoon: number };
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
      { id: 'p1', name: 'Perfil 1', clientId: 'c1', status: 'active' },
      { id: 'p2', name: 'Perfil 2', clientId: 'c2', status: 'active' },
      { id: 'p3', name: 'Perfil 3', status: 'empty' },
      { id: 'p4', name: 'Perfil 4', status: 'empty' },
      { id: 'p5', name: 'Kids', status: 'empty' },
    ],
    startDate: new Date().toISOString(),
    expirationDate: addDays(new Date(), 25).toISOString(),
    isRenewable: true,
    cost: 15,
    pricePerProfile: 5,
    status: 'active',
  },
  {
    id: 'a2',
    serviceName: 'Spotify',
    email: 'spotify.music@example.com',
    totalProfiles: 6,
    profiles: [
      { id: 'sp1', name: 'Juan', clientId: 'c3', status: 'active' },
      { id: 'sp2', name: 'Empty', status: 'empty' },
      { id: 'sp3', name: 'Empty', status: 'empty' },
      { id: 'sp4', name: 'Empty', status: 'empty' },
      { id: 'sp5', name: 'Empty', status: 'empty' },
      { id: 'sp6', name: 'Empty', status: 'empty' },
    ],
    startDate: subDays(new Date(), 28).toISOString(),
    expirationDate: addDays(new Date(), 2).toISOString(), // Expiring soon
    isRenewable: true,
    cost: 10,
    pricePerProfile: 3,
    status: 'expiring_soon',
  },
];

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);

  const addAccount = (newAccount: Omit<Account, 'id' | 'status'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAccounts([...accounts, { ...newAccount, id, status: 'active' }]);
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts(accounts.map(acc => (acc.id === id ? { ...acc, ...updates } : acc)));
  };

  const deleteAccount = (id: string) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  const addClient = (client: Omit<Client, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setClients([...clients, { ...client, id }]);
    return id;
  };

  const assignProfile = (accountId: string, profileId: string, clientId: string) => {
    setAccounts(accounts.map(acc => {
      if (acc.id !== accountId) return acc;
      return {
        ...acc,
        profiles: acc.profiles.map(p => 
          p.id === profileId ? { ...p, clientId, status: 'active' } : p
        )
      };
    }));
  };

  const getStats = () => {
    let totalSales = 0;
    let totalCost = 0;
    let activeAccounts = 0;
    let expiringSoon = 0;

    accounts.forEach(acc => {
      totalCost += acc.cost;
      const soldProfiles = acc.profiles.filter(p => p.status === 'active').length;
      totalSales += soldProfiles * acc.pricePerProfile;
      
      if (acc.status === 'active') activeAccounts++;
      if (acc.status === 'expiring_soon') expiringSoon++;
    });

    return {
      totalSales,
      totalCost,
      netProfit: totalSales - totalCost,
      activeAccounts,
      expiringSoon
    };
  };

  return (
    <StreamingContext.Provider value={{ 
      accounts, 
      clients, 
      addAccount, 
      updateAccount, 
      deleteAccount, 
      assignProfile,
      addClient,
      getStats
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
