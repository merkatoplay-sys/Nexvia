import { useStreaming, Account } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, User, MonitorPlay, Trash2, Pencil, ArrowRightLeft, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { format, differenceInDays, parse, isValid } from 'date-fns';
import { motion } from 'framer-motion';

type ProfileLike = {
  id: string;
  name: string;
  status: 'activo' | 'vencido' | 'disponible';
  pin?: string | null;
  clientId?: string | null;
  phone?: string | null;
  price?: number | null;
  __placeholder?: boolean;
};

// ✅ auto-formato dd/MM/yyyy mientras escribe (solo números + inserta /)
const formatDDMMYYYY = (input: string) => {
  const digits = (input || '').replace(/\D/g, '').slice(0, 8); // ddmmyyyy
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);

  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}/${mm}`;
  return `${dd}/${mm}/${yyyy}`;
};

// ✅ normaliza strings (evita bugs por mayúsculas/minúsculas/espacios)
const norm = (v: any) => String(v ?? '').trim().toLowerCase();

// ✅ busca servicio por nombre con fallback tolerante
const findServiceByName = (services: any[], name: any) => {
  const n = norm(name);
  if (!n) return null;

  // 1) match exacto normalizado
  const exact = services.find((s: any) => norm(s?.name) === n);
  if (exact) return exact;

  // 2) match parcial (ej: "netflix" dentro de "netflix premium 4k" o viceversa)
  const partial = services.find((s: any) => {
    const sn = norm(s?.name);
    if (!sn) return false;
    return sn.includes(n) || n.includes(sn);
  });

  return partial ?? null;
};

export default function Accounts() {
  const {
    accounts,
    addAccount,
    clients,
    updateProfile,
    deleteAccount,
    updateAccount,
    moveProfiles,
    getMaxProfilesByService,
    services,
    getServiceColor,
  } = useStreaming();

  const [, navigate] = useLocation();

  const accountsSafe = accounts ?? [];
  const servicesSafe = services ?? [];
  const clientsSafe = clients ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState<string>('all'); // guarda serviceId
  const [isAddOpen, setIsAddOpen] = useState(false);

  // mostrar/ocultar password
  const [showNewAccountPassword, setShowNewAccountPassword] = useState(false);
  const [showEditAccountPassword, setShowEditAccountPassword] = useState(false);
  const [showPasswordByAccount, setShowPasswordByAccount] = useState<Record<string, boolean>>({});

  const [editingProfile, setEditingProfile] = useState<{ accountId: string; profile: ProfileLike } | null>(null);
  const [editData, setEditData] = useState({ name: '', pin: '', clientId: '', phone: '', price: 0 });

  // ver/ocultar PIN dentro del modal de editar perfil
  const [showEditProfilePin, setShowEditProfilePin] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string; email: string }>({
    open: false,
    id: '',
    name: '',
    email: '',
  });

  // ✅ serviceId + expirationDate (dd/MM/yyyy)
  const [newAccount, setNewAccount] = useState<Partial<Account> & { serviceId?: string; expirationDate?: string }>({
    serviceId: '',
    serviceName: '',
    totalProfiles: 5,
    isRenewable: true,
    expirationDate: '',
  });

  // Editar cuenta maestra
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editAccountData, setEditAccountData] = useState({
    email: '',
    password: '',
    expirationDate: '', // dd/MM/yyyy
    cost: 0,
    isRenewable: true,
  });

  // Mover perfiles
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveFromAccount, setMoveFromAccount] = useState<any>(null);
  const [moveToAccountId, setMoveToAccountId] = useState<string>('');
  const [selectedMoveProfileIds, setSelectedMoveProfileIds] = useState<string[]>([]);

  // ✅ resolver servicio por account (por ID, fallback por nombre robusto)
  const getServiceForAccount = (acc: any) => {
    if (!acc) return null;

    // 1) por ID (ideal)
    const byId = acc.serviceId ? servicesSafe.find((s: any) => s.id === acc.serviceId) : null;
    if (byId) return byId;

    // 2) por nombre (case-insensitive + tolerant)
    if (acc.serviceName) return findServiceByName(servicesSafe, acc.serviceName);

    return null;
  };

  const getServiceForNewAccount = () => {
    const byId = newAccount.serviceId ? servicesSafe.find((s: any) => s.id === newAccount.serviceId) : null;
    if (byId) return byId;

    if (newAccount.serviceName) return findServiceByName(servicesSafe, newAccount.serviceName);

    return null;
  };

  // ✅ cuando abres modal y no hay serviceId, asigna uno default
  useEffect(() => {
    if (!isAddOpen) return;
    if (servicesSafe.length === 0) return;

    setNewAccount((prev) => {
      if (prev.serviceId) return prev;

      // ✅ tolerante
      const netflix = servicesSafe.find((s: any) => norm(s?.name) === 'netflix');
      const first = netflix ?? servicesSafe[0];

      return {
        ...prev,
        serviceId: first?.id ?? '',
        serviceName: first?.name ?? '',
      };
    });
  }, [isAddOpen, servicesSafe]);

  const filteredAccounts = useMemo(() => {
    return accountsSafe.filter((acc: any) => {
      const service = getServiceForAccount(acc);
      const serviceName = service?.name ?? acc.serviceName ?? '';

      const matchesSearch =
        (acc.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        serviceName.toLowerCase().includes(searchTerm.toLowerCase());

      // ✅ filtro por serviceId, con fallback por nombre para cuentas viejas (más robusto)
      const matchesService =
        filterService === 'all' ||
        (acc.serviceId && acc.serviceId === filterService) ||
        (!acc.serviceId && service && service.id === filterService) ||
        (!acc.serviceId &&
          !service &&
          norm(acc.serviceName) === norm(servicesSafe.find((s: any) => s.id === filterService)?.name));

      return matchesSearch && matchesService;
    });
  }, [accountsSafe, searchTerm, filterService, servicesSafe]);

  const handleAddAccount = async () => {
    const svc = getServiceForNewAccount();
    const serviceId = newAccount.serviceId || svc?.id || '';
    const serviceName = svc?.name || newAccount.serviceName || '';

    if (!serviceId || !serviceName) return;
    if (!newAccount.email || newAccount.cost === undefined || newAccount.cost === null) return;

    // ✅ vencimiento dd/MM/yyyy -> ISO (si está vacío: +30 días)
    let expISO: string;
    const expText = newAccount.expirationDate?.trim();
    if (expText) {
      const parsed = parse(expText, 'dd/MM/yyyy', new Date());
      if (!isValid(parsed)) return;
      parsed.setHours(0, 0, 0, 0);
      expISO = parsed.toISOString();
    } else {
      expISO = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const success = await addAccount({
      serviceId,
      serviceName,
      email: newAccount.email || '',
      password: newAccount.password || '',
      totalProfiles: Number(newAccount.totalProfiles || 5),
      startDate: new Date().toISOString(),
      expirationDate: expISO,
      isRenewable: newAccount.isRenewable ?? true,
      cost: Number(newAccount.cost) || 0,
      pricePerProfile: 0,
      status: 'activa',
    } as any);

    if (success) {
      setIsAddOpen(false);
      setShowNewAccountPassword(false);
      setNewAccount({ serviceId: '', serviceName: '', totalProfiles: 5, isRenewable: true, expirationDate: '' });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm.id) {
      await deleteAccount(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: '', name: '', email: '' });
    }
  };

  // mover helpers
  const activeProfilesOfFrom: ProfileLike[] = (moveFromAccount?.profiles ?? []).filter((p: any) => p.status === 'activo');

  const selectFirstN = (n: number) => {
    const ids = activeProfilesOfFrom.slice(0, n).map((p: any) => p.id);
    setSelectedMoveProfileIds(ids);
  };
  const selectAll = () => setSelectedMoveProfileIds(activeProfilesOfFrom.map((p: any) => p.id));
  const toggleSelect = (id: string) => {
    setSelectedMoveProfileIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // ✅ candidates por serviceId si existe, fallback por serviceName (case-insensitive)
  const destinationCandidates = (accountsSafe ?? [])
    .filter((a: any) => {
      if (!moveFromAccount) return false;
      if (a.id === moveFromAccount.id) return false;

      if (moveFromAccount.serviceId && a.serviceId) return a.serviceId === moveFromAccount.serviceId;

      // fallback viejo (blindado)
      return norm(a.serviceName) === norm(moveFromAccount.serviceName);
    })
    .map((a: any) => ({
      ...a,
      available: (a.profiles ?? []).filter((p: any) => p.status === 'disponible').length,
    }));

  // ✅ mandar a ventas con serviceId (y serviceName fallback)
  const goSellFromSlot = (serviceId: string, serviceName: string, accountId: string, profile?: ProfileLike) => {
    const params = new URLSearchParams();
    params.set('mode', 'perfil');
    params.set('serviceId', serviceId); // ✅ nuevo
    params.set('service', serviceName); // ✅ fallback
    params.set('accountId', accountId);

    if (profile && !profile.__placeholder && profile.status === 'disponible') {
      params.set('profileId', profile.id);
    }

    navigate(`/sales?${params.toString()}`);
  };

  // helper imagen del servicio
  const getServiceImage = (svc: any): string => {
    if (!svc) return '';
    return svc.imageUrl || svc.iconUrl || svc.image || svc.logoUrl || '';
  };

  const newSvc = getServiceForNewAccount();
  const maxProfilesLabel =
    getMaxProfilesByService?.((newSvc?.id || newSvc?.name || newAccount.serviceName || 'Netflix') as any) ?? 5;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Cuentas Maestras</h1>
          <p className="text-muted-foreground">Gestiona tus suscripciones y distribuye perfiles.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]"
              data-testid="button-add-account"
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva Cuenta
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Cuenta</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Servicio</label>

                  <Select
                    onValueChange={(val) => {
                      const svc = servicesSafe.find((s: any) => s.id === val);
                      setNewAccount({
                        ...newAccount,
                        serviceId: val,
                        serviceName: svc?.name ?? '',
                      });
                    }}
                    value={newAccount.serviceId || ''}
                  >
                    <SelectTrigger className="glass-input" data-testid="select-service">
                      <SelectValue placeholder="Servicio" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {servicesSafe
                        .filter((s: any) => s.name && s.name.trim())
                        .map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Perfiles (Máx: {maxProfilesLabel})</label>
                  <Input
                    type="number"
                    className="glass-input"
                    value={newAccount.totalProfiles}
                    onChange={(e) => setNewAccount({ ...newAccount, totalProfiles: parseInt(e.target.value || '0') })}
                    max={maxProfilesLabel}
                    data-testid="input-profiles"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Email de la cuenta</label>
                <Input
                  className="glass-input"
                  placeholder="ejemplo@correo.com"
                  value={newAccount.email || ''}
                  onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                  autoComplete="off"
                  name="serviceEmail"
                  data-testid="input-account-email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Contraseña</label>

                <div className="relative">
                  <Input
                    className="glass-input pr-10"
                    type={showNewAccountPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newAccount.password || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                    autoComplete="new-password"
                    name="serviceSecret"
                    data-testid="input-account-password"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-white"
                    onClick={() => setShowNewAccountPassword((v) => !v)}
                    title={showNewAccountPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showNewAccountPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Costo ($)</label>
                  <Input
                    type="number"
                    className="glass-input"
                    value={(newAccount.cost as any) ?? ''}
                    onChange={(e) => setNewAccount({ ...newAccount, cost: parseFloat(e.target.value || '0') })}
                    data-testid="input-account-cost"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Vence (dd/MM/aaaa)</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    className="glass-input"
                    placeholder="31/01/2026"
                    value={newAccount.expirationDate || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, expirationDate: formatDDMMYYYY(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">¿Renovable?</label>
                  <Select
                    value={(newAccount.isRenewable ?? true) ? 'si' : 'no'}
                    onValueChange={(val) => setNewAccount({ ...newAccount, isRenewable: val === 'si' })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="border-white/10 hover:bg-white/5 text-white"
              >
                Cancelar
              </Button>
              <Button onClick={handleAddAccount} className="bg-primary text-white" data-testid="button-save-account">
                Guardar Cuenta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center bg-card/40 p-4 rounded-lg border border-white/5 backdrop-blur-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 glass-input bg-background/20"
            placeholder="Buscar por email o servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search"
          />
        </div>

        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="w-[180px] glass-input bg-background/20" data-testid="select-filter">
            <SelectValue placeholder="Filtrar Servicio" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-white/10 text-white">
            <SelectItem value="all">Todos</SelectItem>
            {servicesSafe
              .filter((s: any) => s.name && s.name.trim())
              .map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {accountsSafe.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MonitorPlay className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No hay cuentas maestras</h3>
            <p className="text-muted-foreground text-center mb-6">
              Registra tu primera cuenta de streaming para comenzar a distribuir perfiles.
            </p>
            <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> Agregar Cuenta
            </Button>
          </CardContent>
        </Card>
      ) : filteredAccounts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Sin resultados</h3>
            <p className="text-muted-foreground text-center">
              No se encontraron cuentas que coincidan con tu búsqueda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredAccounts.map((account: any) => {
            const daysLeft = differenceInDays(new Date(account.expirationDate), new Date());

            const svc = getServiceForAccount(account);
            const serviceName = svc?.name ?? account.serviceName ?? 'Servicio';

            const serviceColor =
              svc?.color ??
              (getServiceColor?.((svc?.id || account.serviceId || serviceName) as any) as string) ??
              '#6366f1';

            const serviceImage = getServiceImage(svc);

            const realProfiles: ProfileLike[] = (account.profiles ?? []) as ProfileLike[];
            const totalSlots = Number(account.totalProfiles || 0);

            const displayProfiles: ProfileLike[] = Array.from({ length: totalSlots }, (_, idx) => {
              const p = realProfiles[idx];
              return (
                p ?? {
                  id: `placeholder-${account.id}-${idx}`,
                  name: 'Disponible',
                  status: 'disponible',
                  __placeholder: true,
                }
              );
            });

            const activeCount = (realProfiles ?? []).filter((p: any) => p.status === 'activo').length;

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="glass-card overflow-hidden group hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="bg-white/5 border-b border-white/5 pb-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center font-bold text-white shadow-lg shrink-0"
                          style={{ backgroundColor: serviceColor }}
                        >
                          {serviceImage ? (
                            <img
                              src={serviceImage}
                              alt={serviceName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{String(serviceName).substring(0, 1)}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <CardTitle className="text-lg text-white">{serviceName}</CardTitle>
                          <p className="text-xs text-muted-foreground truncate">{account.email}</p>

                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground truncate">
                              {showPasswordByAccount[account.id] ? (account.password || '') : '••••••••'}
                            </p>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-white"
                              onClick={() =>
                                setShowPasswordByAccount((prev) => ({
                                  ...prev,
                                  [account.id]: !prev[account.id],
                                }))
                              }
                              title={showPasswordByAccount[account.id] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                              {showPasswordByAccount[account.id] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge
                          variant={daysLeft < 3 ? 'destructive' : 'default'}
                          className={daysLeft >= 3 ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : ''}
                        >
                          {daysLeft} días
                        </Badge>

                        <div className="flex gap-2">
                          {activeCount > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                              title="Mover perfiles"
                              onClick={() => {
                                setMoveFromAccount(account);
                                setMoveToAccountId('');
                                setSelectedMoveProfileIds([]);
                                setMoveOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-8 h-8 p-0 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300"
                            title="Editar cuenta"
                            onClick={() => {
                              setEditingAccount(account);
                              setShowEditAccountPassword(false);
                              setEditAccountData({
                                email: account.email || '',
                                password: account.password || '',
                                expirationDate: account.expirationDate ? format(new Date(account.expirationDate), 'dd/MM/yyyy') : '',
                                cost: Number(account.cost || 0),
                                isRenewable: !!account.isRenewable,
                              });
                              setEditAccountOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDeleteConfirm({ open: true, id: account.id, name: serviceName, email: account.email })
                            }
                            className="w-8 h-8 p-0 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-background/40 p-2 rounded border border-white/5 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Inicio</span>
                        <span className="text-xs font-medium text-white">{format(new Date(account.startDate), 'dd MMM')}</span>
                      </div>
                      <div className="bg-background/40 p-2 rounded border border-white/5 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Vence</span>
                        <span className="text-xs font-medium text-white">
                          {format(new Date(account.expirationDate), 'dd MMM')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Perfiles</h4>

                      {displayProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          className="flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-sm cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault?.();
                            e.stopPropagation?.();

                            if (profile.status === 'activo') {
                              setEditingProfile({ accountId: account.id, profile });
                              setShowEditProfilePin(false);

                              setEditData({
                                name: profile.name ?? '',
                                pin: profile.pin ?? '',
                                clientId: profile.clientId ?? '',
                                phone: profile.phone ?? '',
                                price: profile.price ?? 0,
                              });
                              return;
                            }

                            if (profile.status === 'disponible') {
                              const finalServiceId = account.serviceId || svc?.id || '';
                              goSellFromSlot(finalServiceId, serviceName, account.id, profile);
                            }
                          }}
                          title={profile.status === 'activo' ? 'Editar' : profile.status === 'disponible' ? 'Vender' : ''}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <User
                              className={`h-3 w-3 shrink-0 ${
                                profile.status === 'activo' ? 'text-primary' : 'text-muted-foreground'
                              }`}
                            />
                            <span
                              className={`truncate ${
                                profile.status === 'disponible' ? 'text-muted-foreground italic' : 'text-white'
                              }`}
                            >
                              {profile.name}
                            </span>
                          </div>

                          {profile.status === 'activo' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[10px] h-5">
                              Activo
                            </Badge>
                          ) : profile.status === 'vencido' ? (
                            <Badge className="bg-red-500/15 text-red-300 border border-red-500/25 text-[10px] h-5">
                              Vencido
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Disponible</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Editar perfil */}
      {editingProfile && (
        <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
          <DialogContent
            className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-h-[80vh] overflow-y-auto"
            aria-describedby={undefined}
          >
            <DialogHeader>
              <DialogTitle>Editar Perfil: {editingProfile.profile.name}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <Input
                  className="glass-input"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Teléfono</label>
                <Input
                  className="glass-input"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">PIN</label>
                <div className="relative">
                  <Input
                    className="glass-input pr-10"
                    type={showEditProfilePin ? 'text' : 'password'}
                    value={editData.pin}
                    onChange={(e) => setEditData({ ...editData, pin: e.target.value })}
                    placeholder="PIN"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-white"
                    onClick={() => setShowEditProfilePin((v) => !v)}
                    title={showEditProfilePin ? 'Ocultar PIN' : 'Mostrar PIN'}
                  >
                    {showEditProfilePin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Cliente</label>
                <Select
                  value={editData.clientId?.trim() ? editData.clientId : '__none__'}
                  onValueChange={(val) => setEditData({ ...editData, clientId: val === '__none__' ? '' : val })}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {clientsSafe.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Precio</label>
                <Input
                  type="number"
                  className="glass-input"
                  value={editData.price}
                  onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value || '0') })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingProfile(null)}
                className="border-white/10 hover:bg-white/5 text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  updateProfile(editingProfile.accountId, editingProfile.profile.id, {
                    name: editData.name,
                    pin: editData.pin?.trim() ? editData.pin.trim() : null,
                    clientId: editData.clientId?.trim() ? editData.clientId.trim() : null,
                    phone: editData.phone?.trim() ? editData.phone.trim() : null,
                    price: editData.price || undefined,
                  } as any);
                  setEditingProfile(null);
                }}
                className="bg-primary text-white"
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Editar cuenta maestra */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent
          className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-h-[80vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Editar Cuenta</DialogTitle>
          </DialogHeader>

          {!editingAccount ? (
            <p className="text-sm text-muted-foreground">No hay cuenta seleccionada.</p>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Email</label>
                <Input
                  className="glass-input"
                  value={editAccountData.email}
                  onChange={(e) => setEditAccountData({ ...editAccountData, email: e.target.value })}
                  autoComplete="off"
                  name="serviceEmailEdit"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Contraseña</label>
                <div className="relative">
                  <Input
                    className="glass-input pr-10"
                    value={editAccountData.password}
                    onChange={(e) => setEditAccountData({ ...editAccountData, password: e.target.value })}
                    type={showEditAccountPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    name="serviceSecretEdit"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-white"
                    onClick={() => setShowEditAccountPassword((v) => !v)}
                    title={showEditAccountPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showEditAccountPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Vence (dd/MM/aaaa)</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    className="glass-input"
                    placeholder="31/01/2026"
                    value={editAccountData.expirationDate}
                    onChange={(e) =>
                      setEditAccountData({ ...editAccountData, expirationDate: formatDDMMYYYY(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">¿Renovable?</label>
                  <Select
                    value={editAccountData.isRenewable ? 'si' : 'no'}
                    onValueChange={(val) => setEditAccountData({ ...editAccountData, isRenewable: val === 'si' })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Costo (informativo)</label>
                <Input
                  type="number"
                  className="glass-input"
                  value={editAccountData.cost}
                  onChange={(e) => setEditAccountData({ ...editAccountData, cost: parseFloat(e.target.value || '0') })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Nota: cambiar el costo aquí NO cambia el gasto histórico (eso queda en transacciones).
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditAccountOpen(false)}
              className="border-white/10 hover:bg-white/5 text-white"
            >
              Cancelar
            </Button>
            <Button
              className="bg-primary text-white"
              disabled={!editingAccount}
              onClick={async () => {
                if (!editingAccount) return;

                let expISO: string | undefined = undefined;
                const expText = editAccountData.expirationDate?.trim();
                if (expText) {
                  const parsed = parse(expText, 'dd/MM/yyyy', new Date());
                  if (!isValid(parsed)) return;
                  parsed.setHours(0, 0, 0, 0);
                  expISO = parsed.toISOString();
                }

                const ok = await updateAccount(
                  editingAccount.id,
                  {
                    email: editAccountData.email,
                    password: editAccountData.password,
                    expirationDate: expISO,
                    isRenewable: editAccountData.isRenewable,
                    cost: Number(editAccountData.cost || 0),
                  } as any
                );

                if (ok) setEditAccountOpen(false);
              }}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mover perfiles */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent
          className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-h-[80vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>
              Mover perfiles{' '}
              {moveFromAccount
                ? `(${getServiceForAccount(moveFromAccount)?.name ?? moveFromAccount.serviceName ?? ''})`
                : ''}
            </DialogTitle>
          </DialogHeader>

          {!moveFromAccount ? (
            <p className="text-sm text-muted-foreground">No hay cuenta origen seleccionada.</p>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground">Cuenta origen</p>
                <p className="text-sm text-white font-medium">{moveFromAccount.email}</p>
                <p className="text-xs text-muted-foreground">Activos: {activeProfilesOfFrom.length}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Cuenta destino (mismo servicio)</label>
                <Select value={moveToAccountId} onValueChange={setMoveToAccountId}>
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Selecciona una cuenta destino" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    {destinationCandidates.map((a: any) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.available === 0}>
                        {a.email} ({a.available} slots)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Seleccionar perfiles a mover</label>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 hover:bg-white/5 text-white h-8 text-xs"
                    onClick={() => selectFirstN(1)}
                    disabled={activeProfilesOfFrom.length < 1}
                  >
                    1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 hover:bg-white/5 text-white h-8 text-xs"
                    onClick={() => selectFirstN(2)}
                    disabled={activeProfilesOfFrom.length < 2}
                  >
                    2
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 hover:bg-white/5 text-white h-8 text-xs"
                    onClick={() => selectFirstN(3)}
                    disabled={activeProfilesOfFrom.length < 3}
                  >
                    3
                  </Button>
                  <Button
                    type="button"
                    className="bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary h-8 text-xs"
                    onClick={selectAll}
                    disabled={activeProfilesOfFrom.length === 0}
                  >
                    Todos
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeProfilesOfFrom.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-white/5 border border-white/10">
                      <div>
                        <p className="text-sm text-white font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.phone || 'Sin teléfono'}</p>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMoveProfileIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="h-4 w-4 accent-violet-500"
                        />
                        Seleccionar
                      </label>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Seleccionados: <span className="text-white">{selectedMoveProfileIds.length}</span>
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMoveOpen(false)}
              className="border-white/10 hover:bg-white/5 text-white"
            >
              Cancelar
            </Button>

            <Button
              className="bg-primary text-white"
              disabled={!moveFromAccount || !moveToAccountId || selectedMoveProfileIds.length === 0}
              onClick={async () => {
                if (!moveFromAccount) return;

                const ok = await moveProfiles(moveFromAccount.id, moveToAccountId, selectedMoveProfileIds);
                if (ok) {
                  setMoveOpen(false);
                  setMoveFromAccount(null);
                  setMoveToAccountId('');
                  setSelectedMoveProfileIds([]);
                }
              }}
            >
              Mover seleccionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title={`¿Eliminar cuenta "${deleteConfirm.name}"?`}
        description={`Se eliminará la cuenta ${deleteConfirm.email} junto con sus perfiles. Las transacciones (gastos/ganancias) se conservarán para mantener tu contabilidad.`}
        confirmText="Eliminar Cuenta"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
