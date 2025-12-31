import React, { createContext, useContext, ReactNode } from 'react';
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
  profiles?: Profile[];

  saleType?: 'perfiles' | 'cuenta';
  soldClientId?: string | null;
  soldStartDate?: string | null;
  soldEndDate?: string | null;

  isArchived?: boolean;
  archivedAt?: string | null;
}

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

  isVoided?: boolean;
  voidedAt?: string | null;
  voidReason?: string | null;
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

  // ✅ NUEVO: plantillas
  telegramAccountTemplate?: string | null;
  telegramProfileTemplate?: string | null;
  saleMessageTemplate?: string | null;
}

interface StreamingContextType {
  accounts: Account[];
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

  sellAccount: (
    accountId: string,
    data: { name: string; phone: string; pin?: string; price: number; startDate: string; endDate: string }
  ) => Promise<boolean>;

  moveProfiles: (fromAccountId: string, toAccountId: string, profileIds: string[]) => Promise<boolean>;

  renewProfile: (accountId: string, profileId: string, renewalPrice: number) => Promise<boolean>;
  renewAccount: (accountId: string) => Promise<boolean>;

  updateProfile: (accountId: string, profileId: string, updates: Partial<Profile>) => Promise<boolean>;

  addClient: (client: Omit<Client, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => Promise<void>;

  voidExpense: (expenseId: string, reason?: string) => Promise<boolean>;

  addService: (service: Omit<Service, 'id' | 'userId' | 'createdAt'>) => Promise<Service | null>;
  updateService: (id: string, updates: Partial<Service>) => Promise<boolean>;
  deleteService: (id: string) => Promise<void>;

  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;

  getAllProfiles: () => Array<Profile & { accountName: string }>;
  getStats: () => { totalSales: number; totalExpenses: number; netProfit: number; activeAccounts: number; expiringSoon: number };
  getServiceColor: (serviceName: string) => string;
  getMaxProfilesByService: (serviceName: ServiceType) => number;

  deleteProfile: (accountId: string, profileId: string) => Promise<void>;

  sendTelegramTestNotification: (botToken: string, chatId: string) => Promise<boolean>;
  renewAccountMaster: (accountId: string, renewalDays: number, cost: number) => Promise<boolean>;
  renewProfileSale: (accountId: string, profileId: string, renewalDays: number, cost: number) => Promise<boolean>;
  processRefund: (profileId: string, amount: number, reason: string) => Promise<boolean>;
  recordAdjustment: (description: string, amount: number, reference: string) => Promise<void>;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

async function fetchAPI(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    const errorData = await res.json().catch(() => ({ message: 'Error del servidor' }));
    throw new Error(errorData.message || 'Error del servidor');
  }

  return res.json();
}

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    queryFn: () => fetchAPI('/api/accounts'),
    enabled: isAuthenticated,
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: () => fetchAPI('/api/clients'),
    enabled: isAuthenticated,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
    queryFn: () => fetchAPI('/api/expenses'),
    enabled: isAuthenticated,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: () => fetchAPI('/api/services'),
    enabled: isAuthenticated,
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<Profile[]>({
    queryKey: ['/api/profiles'],
    queryFn: () => fetchAPI('/api/profiles'),
    enabled: isAuthenticated,
  });

  const { data: settings = null, isLoading: settingsLoading } = useQuery<AppSettings | null>({
    queryKey: ['/api/settings'],
    queryFn: () => fetchAPI('/api/settings'),
    enabled: isAuthenticated,
  });

  const isLoading =
    accountsLoading || clientsLoading || expensesLoading || servicesLoading || profilesLoading || settingsLoading;

  const createAccountMutation = useMutation({
    mutationFn: (account: any) => fetchAPI('/api/accounts', { method: 'POST', body: JSON.stringify(account) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast.error('Sesión expirada. Redirigiendo...');
        setTimeout(() => (window.location.href = '/api/login'), 500);
      }
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Account> }) =>
      fetchAPI(`/api/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/api/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Profile> }) =>
      fetchAPI(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/api/profiles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
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

  const voidExpenseMutation = useMutation({
    mutationFn: ({ expenseId, reason }: { expenseId: string; reason?: string }) =>
      fetchAPI(`/api/expenses/${expenseId}/void`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/expenses'] }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (updates: any) => fetchAPI('/api/settings', { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/settings'] }),
  });

  // ✅ Crear cuenta (backend YA crea slots reales en DB)
  const addAccount = async (newAccount: Omit<Account, 'id' | 'status' | 'userId' | 'createdAt'>) => {
    const service = services.find((s) => s.name === newAccount.serviceName);
    const maxProfiles = service?.maxProfiles || 7;

    if (newAccount.totalProfiles > maxProfiles) {
      toast.error(`${newAccount.serviceName} permite un máximo de ${maxProfiles} perfiles.`);
      return false;
    }

    const accountToCreate = {
      ...newAccount,
      pricePerProfile: 0,
      status: 'activa' as const,
    };

    try {
      await createAccountMutation.mutateAsync(accountToCreate);

      await queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });

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

  // ✅ ahora “eliminar” = archivar
  const deleteAccount = async (id: string) => {
    try {
      await deleteAccountMutation.mutateAsync(id);
      toast.success('Cuenta archivada (tus transacciones se conservan)');
    } catch {
      toast.error('Error al archivar la cuenta');
    }
  };

  const addClient = async (client: Omit<Client, 'id' | 'userId' | 'createdAt'>) => {
    try {
      const created = await createClientMutation.mutateAsync(client);
      return created.id;
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

  const voidExpense = async (expenseId: string, reason?: string) => {
    try {
      await voidExpenseMutation.mutateAsync({ expenseId, reason });
      toast.success('Movimiento anulado');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Error al anular movimiento');
      return false;
    }
  };

  const addService = async (service: Omit<Service, 'id' | 'userId' | 'createdAt'>): Promise<Service | null> => {
    if (!service.name || !service.name.trim()) {
      toast.error('El nombre del servicio no puede estar vacío');
      return null;
    }
    if (services.some((s) => s.name === service.name)) {
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

  const sellProfile = async (
    accountId: string,
    profileId: string,
    clientData: { name: string; phone: string; pin?: string; price: number; startDate: string; endDate: string }
  ) => {
    try {
      let clientId = '';
      const existingClient = clients.find((c) => c.phone === clientData.phone);
      if (existingClient) clientId = existingClient.id;
      else clientId = await addClient({ name: clientData.name, phone: clientData.phone });

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

  const sellAccount = async (
    accountId: string,
    data: { name: string; phone: string; pin?: string; price: number; startDate: string; endDate: string }
  ) => {
    try {
      await fetchAPI(`/api/accounts/${accountId}/sell`, { method: 'POST', body: JSON.stringify(data) });

      await queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });

      toast.success('Cuenta completa vendida exitosamente');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Error al vender cuenta completa');
      return false;
    }
  };

  const moveProfiles = async (fromAccountId: string, toAccountId: string, profileIds: string[]) => {
    try {
      await fetchAPI('/api/profiles/move', {
        method: 'POST',
        body: JSON.stringify({ fromAccountId, toAccountId, profileIds }),
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });

      toast.success(`Perfiles movidos: ${profileIds.length}`);
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Error al mover perfiles');
      return false;
    }
  };

  const renewProfile = async (accountId: string, profileId: string, renewalPrice: number) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile || profile.status !== 'activo') {
      toast.error('Este perfil no puede renovarse');
      return false;
    }

    const account = accounts.find((a) => a.id === accountId);
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
    const account = accounts.find((a) => a.id === accountId);
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

  const updateProfile = async (accountId: string, profileId: string, updates: Partial<Profile>) => {
    try {
      await updateProfileMutation.mutateAsync({ id: profileId, updates });
      toast.success('Perfil actualizado exitosamente');
      return true;
    } catch {
      toast.error('Error al actualizar el perfil');
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

  const getAllProfiles = () =>
    profiles.map((profile) => {
      const account = accounts.find((a) => a.id === profile.accountId);
      return { ...profile, accountName: account?.serviceName || 'Desconocido' };
    });

  const getStats = () => {
    const valid = expenses.filter((e) => !e.isVoided);

    const totalSales = valid.filter((e) => e.type === 'ganancia').reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = valid.filter((e) => e.type === 'gasto').reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - totalExpenses;

    const activeAccounts = accounts.filter((a) => a.status === 'activa').length;
    const expiringSoon = accounts.filter((a) => {
      const daysUntilExpiry = differenceInDays(new Date(a.expirationDate), new Date());
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    }).length;

    return { totalSales, totalExpenses, netProfit, activeAccounts, expiringSoon };
  };

  const getServiceColor = (serviceName: string) => {
    const service = services.find((s) => s.name === serviceName);
    return service?.color || '#6366f1';
  };

  const getMaxProfilesByService = (serviceName: ServiceType) => {
    const service = services.find((s) => s.name === serviceName);
    return service?.maxProfiles || 7;
  };

  const deleteService = async (id: string) => {
    try {
      await deleteServiceMutation.mutateAsync(id);
      toast.success('Servicio eliminado');
    } catch {
      toast.error('Error al eliminar el servicio');
    }
  };

  const deleteProfile = async (accountId: string, profileId: string) => {
    try {
      await deleteProfileMutation.mutateAsync(profileId);
      toast.success('Perfil eliminado');
    } catch {
      toast.error('Error al eliminar el perfil');
    }
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
    const account = accounts.find((a) => a.id === accountId);
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
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile || profile.status !== 'activo') {
      toast.error('Este perfil no puede renovarse');
      return false;
    }

    const account = accounts.find((a) => a.id === accountId);
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
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) {
      toast.error('Perfil no encontrado');
      return false;
    }

    const account = accounts.find((a) => a.id === profile.accountId);
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
        } as any,
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
        sellAccount,
        moveProfiles,
        renewProfile,
        renewAccount,
        updateProfile,
        addClient,
        addExpense,
        voidExpense,
        addService,
        updateService,
        deleteService,
        updateSettings,
        getAllProfiles,
        getStats,
        getServiceColor,
        getMaxProfilesByService,
        deleteProfile,
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
