import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { isUnauthorizedError } from '@/lib/auth-utils';

export type ServiceType = string;

export interface Service {
  id: string;
  userId: string;
  name: string;
  color: string;
  maxProfiles: number;
  isCustom: boolean;
  imageUrl?: string | null;
  createdAt?: Date;
}

export interface Profile {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  phone?: string | null;
  pin?: string | null;
  clientId?: string | null;
  price?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status: 'activo' | 'vencido' | 'disponible';
  createdAt?: Date;
}

export interface Account {
  id: string;
  userId: string;
  serviceName: ServiceType;
  email: string;
  password?: string | null;
  totalProfiles: number;
  startDate: string;
  expirationDate: string;
  isRenewable: boolean;
  cost: number;
  pricePerProfile: number;
  status: 'activa' | 'por vencer' | 'vencida';
  createdAt?: Date;
}

export type AccountWithProfiles = Account & { profiles: Profile[] };

export interface Client {
  id: string;
  userId: string;
  name: string;
  phone: string;
  notes?: string | null;
  createdAt?: Date;
}

export interface Expense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: 'ganancia' | 'gasto' | 'ajuste';
  profileId?: string | null;
  accountId?: string | null;
  date: string;
  note?: string | null;
  reference?: string | null;
  createdAt?: Date;
}

export interface AppSettings {
  id: string;
  userId: string;
  defaultCurrency: string;
  notificationsEnabled: boolean;
  notificationChannel: 'whatsapp' | 'telegram';
  daysBeforeExpiry: number;
  notificationTime: string;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
  whatsappPhoneNumber?: string | null;
}

interface StreamingContextType {
  accounts: AccountWithProfiles[];
  clients: Client[];
  expenses: Expense[];
  services: Service[];
  profiles: Profile[];
  settings: AppSettings | null;
  isLoading: boolean;

  addAccount: (account: Omit<Account, 'id' | 'status' | 'userId' | 'createdAt'>) => Promise<boolean>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<void>;

  sellProfile: (
    accountId: string,
    profileId: string,
    clientData: { name: string; phone: string; pin?: string; price: number; startDate: string; endDate: string }
  ) => Promise<boolean>;

  renewProfile: (accountId: string, profileId: string, renewalPrice: number) => Promise<boolean>;
  renewAccount: (accountId: string) => Promise<boolean>;

  updateProfile: (accountId: string, profileId: string, updates: Partial<Profile>) => Promise<boolean>;
  deleteProfile: (accountId: string, profileId: string) => Promise<void>;

  addClient: (client: Omit<Client, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => Promise<void>;

  addService: (service: Omit<Service, 'id' | 'userId' | 'createdAt'>) => Promise<Service | null>;
  updateService: (id: string, updates: Partial<Service>) => Promise<boolean>;
  deleteService: (id: string) => Promise<void>;

  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;

  getAllProfiles: () => Array<Profile & { accountName: string }>;
  getStats: () => { totalSales: number; totalExpenses: number; netProfit: number; activeAccounts: number; expiringSoon: number };
  getServiceColor: (serviceName: string) => string;
  getMaxProfilesByService: (serviceName: ServiceType) => number;

  sendTelegramTestNotification: (botToken: string, chatId: string) => Promise<boolean>;
  renewAccountMaster: (accountId: string, renewalDays: number, cost: number) => Promise<boolean>;
  renewProfileSale: (accountId: string, profileId: string, renewalDays: number, cost: number) => Promise<boolean>;
  processRefund: (profileId: string, amount: number, reason: string) => Promise<boolean>;
  recordAdjustment: (description: string, amount: number, reference: string) => Promise<void>;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

async function fetchAPI(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  // 204/304 pueden venir sin body
  const text = await res.text().catch(() => '');

  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    try {
      const errorData = text ? JSON.parse(text) : { message: 'Error del servidor' };
      throw new Error(errorData.message || 'Error del servidor');
    } catch {
      throw new Error('Error del servidor');
    }
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // ✅ Fuente principal: Accounts ya trae profiles
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: async () => (await fetchAPI('/api/accounts')) ?? [],
    enabled: isAuthenticated,
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => (await fetchAPI('/api/clients')) ?? [],
    enabled: isAuthenticated,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['/api/expenses'],
    queryFn: async () => (await fetchAPI('/api/expenses')) ?? [],
    enabled: isAuthenticated,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => (await fetchAPI('/api/services')) ?? [],
    enabled: isAuthenticated,
  });

  const { data: settings = null, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => (await fetchAPI('/api/settings')) ?? null,
    enabled: isAuthenticated,
  });

  const profiles: Profile[] = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts : [];
    return list.flatMap((a: any) => Array.isArray(a?.profiles) ? a.profiles : []);
  }, [accounts]);

  const isLoading = accountsLoading || clientsLoading || expensesLoading || servicesLoading || settingsLoading;

  const createAccountMutation = useMutation({
    mutationFn: (account: any) => fetchAPI('/api/accounts', { method: 'POST', body: JSON.stringify(account) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast.error('Sesión expirada. Redirigiendo...');
        setTimeout(() => { window.location.href = '/api/login'; }, 500);
      } else {
        toast.error(error.message || 'Error al crear la cuenta');
      }
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Account> }) =>
      fetchAPI(`/api/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/accounts'] }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/api/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: (service: any) => fetchAPI('/api/services', { method: 'POST', body: JSON.stringify(service) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/services'] }),
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Service> }) =>
      fetchAPI(`/api/services/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/services'] }),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/api/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/services'] }),
  });

  // Profiles siguen siendo endpoint propio para mutaciones,
  // pero la UI se refresca invalidando /api/accounts
  const createProfileMutation = useMutation({
    mutationFn: (profile: any) => fetchAPI('/api/profiles', { method: 'POST', body: JSON.stringify(profile) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/accounts'] }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Profile> }) =>
      fetchAPI(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/accounts'] }),
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/api/profiles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: (client: any) => fetchAPI('/api/clients', { method: 'POST', body: JSON.stringify(client) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/clients'] }),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (expense: any) => fetchAPI('/api/expenses', { method: 'POST', body: JSON.stringify(expense) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/expenses'] }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (updates: any) => fetchAPI('/api/settings', { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/settings'] }),
  });

  const addClient = async (client: Omit<Client, 'id' | 'userId' | 'createdAt'>) => {
    try {
      const created = await createClientMutation.mutateAsync(client);
      return created?.id || '';
    } catch {
      toast.error('Error al agregar cliente');
      return '';
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => {
    try {
      await createExpenseMutation.mutateAsync(expense);
    } catch {
      toast.error('Error al registrar transacción');
    }
  };

  const addAccount = async (newAccount: Omit<Account, 'id' | 'status' | 'userId' | 'createdAt'>) => {
    const service = services.find(s => s.name === newAccount.serviceName);
    const maxProfiles = service?.maxProfiles || 7;

    if (newAccount.totalProfiles > maxProfiles) {
      toast.error(`${newAccount.serviceName} permite un máximo de ${maxProfiles} perfiles.`);
      return false;
    }

    try {
      const createdAccount = await createAccountMutation.mutateAsync({
        ...newAccount,
        status: 'activa' as const,
      });

      const profilesData = Array.from({ length: newAccount.totalProfiles }, () => ({
        accountId: createdAccount.id,
        name: 'Disponible',
        status: 'disponible' as const,
      }));

      await Promise.all(profilesData.map(p => createProfileMutation.mutateAsync(p)));

      toast.success(`Cuenta ${newAccount.serviceName} agregada exitosamente`);
      return true;
    } catch {
      toast.error('Error al crear la cuenta');
      return false;
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      await updateAccountMutation.mutateAsync({ id, updates });
      toast.success('Cuenta actualizada exitosamente');
      return true;
    } catch {
      toast.error('Error al actualizar la cuenta');
      return false;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await deleteAccountMutation.mutateAsync(id);
      toast.success('Cuenta maestra y sus perfiles eliminados');
    } catch {
      toast.error('Error al eliminar la cuenta');
    }
  };

  const addService = async (service: Omit<Service, 'id' | 'userId' | 'createdAt'>): Promise<Service | null> => {
    if (!service.name || !service.name.trim()) {
      toast.error('El nombre del servicio no puede estar vacío');
      return null;
    }
    if (services.some(s => s.name === service.name)) {
      toast.error('Este servicio ya existe');
      return null;
    }
    try {
      return await createServiceMutation.mutateAsync(service);
    } catch {
      toast.error('Error al crear el servicio');
      return null;
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    try {
      await updateServiceMutation.mutateAsync({ id, updates });
      toast.success('Servicio actualizado exitosamente');
      return true;
    } catch {
      toast.error('Error al actualizar el servicio');
      return false;
    }
  };

  const deleteService = async (id: string) => {
    try {
      await deleteServiceMutation.mutateAsync(id);
      toast.success('Servicio eliminado');
    } catch {
      toast.error('Error al eliminar el servicio');
    }
  };

  const updateProfile = async (_accountId: string, profileId: string, updates: Partial<Profile>) => {
    try {
      await updateProfileMutation.mutateAsync({ id: profileId, updates });
      toast.success('Perfil actualizado exitosamente');
      return true;
    } catch {
      toast.error('Error al actualizar el perfil');
      return false;
    }
  };

  const deleteProfile = async (_accountId: string, profileId: string) => {
    try {
      await deleteProfileMutation.mutateAsync(profileId);
      toast.success('Perfil eliminado');
    } catch {
      toast.error('Error al eliminar el perfil');
    }
  };

  const sellProfile = async (
    accountId: string,
    profileId: string,
    clientData: { name: string; phone: string; pin?: string; price: number; startDate: string; endDate: string }
  ) => {
    try {
      let clientId = '';
      const existingClient = clients.find(c => c.phone === clientData.phone);
      clientId = existingClient ? existingClient.id : await addClient({ name: clientData.name, phone: clientData.phone });

      await updateProfileMutation.mutateAsync({
        id: profileId,
        updates: {
          name: clientData.name,
          phone: clientData.phone,
          pin: clientData.pin,
          price: clientData.price,
          status: 'activo',
          clientId,
          startDate: clientData.startDate,
          endDate: clientData.endDate,
        },
      });

      await addExpense({
        description: `Venta de perfil ${clientData.name}`,
        amount: clientData.price,
        type: 'ganancia',
        profileId,
        accountId,
        date: new Date().toISOString(),
      });

      toast.success(`Perfil vendido a ${clientData.name}`);
      return true;
    } catch {
      toast.error('Error al vender el perfil');
      return false;
    }
  };

  const renewProfile = async (accountId: string, profileId: string, renewalPrice: number) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile || profile.status !== 'activo') {
      toast.error('Este perfil no puede renovarse');
      return false;
    }

    const account = accounts.find(a => a.id === accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    try {
      const newEndDate = addDays(new Date(profile.endDate || new Date()), 30).toISOString();
      await updateProfileMutation.mutateAsync({
        id: profileId,
        updates: { endDate: newEndDate, price: renewalPrice },
      });

      await addExpense({
        description: `Renovación ${profile.name} - ${account.serviceName}`,
        amount: renewalPrice,
        type: 'ganancia',
        profileId,
        accountId,
        date: new Date().toISOString(),
      });

      toast.success('Perfil renovado exitosamente');
      return true;
    } catch {
      toast.error('Error al renovar el perfil');
      return false;
    }
  };

  const renewAccount = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    try {
      const newExpirationDate = addDays(new Date(account.expirationDate), 30).toISOString();
      await updateAccountMutation.mutateAsync({
        id: accountId,
        updates: { expirationDate: newExpirationDate, status: 'activa' },
      });

      await addExpense({
        description: `Renovación cuenta ${account.serviceName}`,
        amount: account.cost,
        type: 'gasto',
        accountId,
        date: new Date().toISOString(),
      });

      toast.success(`Cuenta ${account.serviceName} renovada exitosamente`);
      return true;
    } catch {
      toast.error('Error al renovar la cuenta');
      return false;
    }
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    try {
      await updateSettingsMutation.mutateAsync(updates);
      toast.success('Configuración actualizada');
    } catch {
      toast.error('Error al actualizar la configuración');
    }
  };

  const getAllProfiles = () => {
    return profiles.map(profile => {
      const account = accounts.find(a => a.id === profile.accountId);
      return { ...profile, accountName: account?.serviceName || 'Desconocido' };
    });
  };

  const getStats = () => {
    const totalSales = expenses.filter(e => e.type === 'ganancia').reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = expenses.filter(e => e.type === 'gasto').reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - totalExpenses;

    const activeAccounts = accounts.filter(a => a.status === 'activa').length;
    const expiringSoon = accounts.filter(a => {
      const daysUntilExpiry = differenceInDays(new Date(a.expirationDate), new Date());
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    }).length;

    return { totalSales, totalExpenses, netProfit, activeAccounts, expiringSoon };
  };

  const getServiceColor = (serviceName: string) => {
    const service = services.find(s => s.name === serviceName);
    return service?.color || '#6366f1';
  };

  const getMaxProfilesByService = (serviceName: ServiceType) => {
    const service = services.find(s => s.name === serviceName);
    return service?.maxProfiles || 7;
  };

  const sendTelegramTestNotification = async (botToken: string, chatId: string) => {
    try {
      const message = '✅ Configuración de Telegram exitosa! NEXVIA puede enviar notificaciones.';
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      });
      const data = await response.json();
      return data.ok;
    } catch {
      return false;
    }
  };

  const renewAccountMaster = async (accountId: string, renewalDays: number, cost: number) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    try {
      const newExpirationDate = addDays(new Date(account.expirationDate), renewalDays).toISOString();
      await updateAccountMutation.mutateAsync({
        id: accountId,
        updates: { expirationDate: newExpirationDate, status: 'activa' },
      });

      await addExpense({
        description: `Renovación cuenta ${account.serviceName} (${renewalDays} días)`,
        amount: cost,
        type: 'gasto',
        accountId,
        date: new Date().toISOString(),
      });

      toast.success(`Cuenta renovada por ${renewalDays} días`);
      return true;
    } catch {
      toast.error('Error al renovar la cuenta');
      return false;
    }
  };

  const renewProfileSale = async (accountId: string, profileId: string, renewalDays: number, cost: number) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile || profile.status !== 'activo') {
      toast.error('Este perfil no puede renovarse');
      return false;
    }

    const account = accounts.find(a => a.id === accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    try {
      const newEndDate = addDays(new Date(profile.endDate || new Date()), renewalDays).toISOString();
      await updateProfileMutation.mutateAsync({
        id: profileId,
        updates: { endDate: newEndDate },
      });

      await addExpense({
        description: `Renovación ${profile.name} - ${account.serviceName} (${renewalDays} días)`,
        amount: cost,
        type: 'ganancia',
        profileId,
        accountId,
        date: new Date().toISOString(),
      });

      toast.success(`Perfil renovado por ${renewalDays} días`);
      return true;
    } catch {
      toast.error('Error al renovar el perfil');
      return false;
    }
  };

  const processRefund = async (profileId: string, amount: number, reason: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      toast.error('Perfil no encontrado');
      return false;
    }

    const account = accounts.find(a => a.id === profile.accountId);
    if (!account) {
      toast.error('Cuenta no encontrada');
      return false;
    }

    try {
      await updateProfileMutation.mutateAsync({
        id: profileId,
        updates: {
          status: 'disponible',
          clientId: null,
          name: 'Disponible',
          phone: null,
          pin: null,
          price: null,
          startDate: null,
          endDate: null,
        },
      });

      await addExpense({
        description: `Devolución - ${reason}`,
        amount: -amount,
        type: 'gasto',
        profileId,
        accountId: account.id,
        note: reason,
        date: new Date().toISOString(),
      });

      toast.success('Devolución procesada exitosamente');
      return true;
    } catch {
      toast.error('Error al procesar la devolución');
      return false;
    }
  };

  const recordAdjustment = async (description: string, amount: number, reference: string) => {
    try {
      await addExpense({
        description,
        amount,
        type: 'ajuste',
        reference,
        date: new Date().toISOString(),
      });
      toast.success('Ajuste registrado exitosamente');
    } catch {
      toast.error('Error al registrar el ajuste');
    }
  };

  return (
    <StreamingContext.Provider
      value={{
        accounts,
        clients,
        expenses,
        services,
        profiles,
        settings,
        isLoading,
        addAccount,
        updateAccount,
        deleteAccount,
        sellProfile,
        renewProfile,
        renewAccount,
        updateProfile,
        deleteProfile,
        addClient,
        addExpense,
        addService,
        updateService,
        deleteService,
        updateSettings,
        getAllProfiles,
        getStats,
        getServiceColor,
        getMaxProfilesByService,
        sendTelegramTestNotification,
        renewAccountMaster,
        renewProfileSale,
        processRefund,
        recordAdjustment,
      }}
    >
      {children}
    </StreamingContext.Provider>
  );
};

export const useStreaming = () => {
  const context = useContext(StreamingContext);
  if (!context) throw new Error('useStreaming must be used within a StreamingProvider');
  return context;
};
