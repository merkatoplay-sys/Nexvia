// Profiles.tsx
import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Edit, RotateCw, Trash2, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { differenceInDays, format, parse, isValid } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

function safeDate(value: any): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

const money = (v: any) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return `$${n}`;
};

const norm = (v: any) => String(v ?? '').trim().toLowerCase();

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

export default function Profiles() {
  const { accounts, clients, updateProfile, renewProfile, deleteProfile, services, getServiceColor } = useStreaming();

  const accountsSafe = accounts ?? [];
  const clientsSafe = clients ?? [];
  const servicesSafe = services ?? [];

  const getServiceById = (id?: string) => (id ? servicesSafe.find((s: any) => s.id === id) ?? null : null);

  const getServiceByNameCI = (name?: string) => {
    if (!name) return null;
    const n = norm(name);
    return servicesSafe.find((s: any) => norm(s?.name) === n) ?? null;
  };

  const getServiceForAccount = (acc: any) => {
    if (!acc) return null;
    const byId = acc.serviceId ? getServiceById(acc.serviceId) : null;
    if (byId) return byId;
    if (acc.serviceName) return getServiceByNameCI(acc.serviceName);
    return null;
  };

  const getBaseServiceNameForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return (svc?.name ?? acc?.serviceName ?? 'Servicio').trim();
  };

  const getServiceDisplayNameForAccount = (acc: any) => {
    const base = getBaseServiceNameForAccount(acc);
    const plan = String(acc?.planName ?? '').trim();
    if (plan) return base ? `${base} - ${plan}` : plan;
    return base;
  };

  const getServiceColorForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    const ref = svc?.id || acc?.serviceId || svc?.name || acc?.serviceName || '';
    return svc?.color ?? (getServiceColor?.(String(ref)) as string) ?? '#6366f1';
  };

  const getServiceImageForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return svc?.imageUrl || svc?.iconUrl || svc?.image || svc?.logoUrl || '';
  };

  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [editData, setEditData] = useState({
    name: '',
    pin: '',
    clientId: '',
    phone: '',
    price: '',
    endDate: '', // ✅ NUEVO: dd/MM/yyyy
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    accountId: string;
    profileId: string;
    name: string;
  }>({ open: false, accountId: '', profileId: '', name: '' });

  const handleEdit = (profile: any, accountId: string) => {
    setEditingId(profile.id + accountId);
    setEditData({
      name: profile.name ?? '',
      pin: profile.pin ?? '',
      clientId: profile.clientId ?? '',
      phone: profile.phone ?? '',
      price: profile.price != null ? String(profile.price) : '',
      endDate: profile.endDate ? format(new Date(profile.endDate), 'dd/MM/yyyy') : '',
    });
  };

  const handleSave = async (accountId: string, profileId: string) => {
    // ✅ dd/MM/yyyy -> ISO
    let endDateISO: string | null | undefined = undefined;
    const endText = (editData.endDate || '').trim();

    if (endText) {
      const parsed = parse(endText, 'dd/MM/yyyy', new Date());
      if (!isValid(parsed)) {
        toast.error('Fecha de vencimiento inválida. Usa formato dd/MM/aaaa');
        return;
      }
      parsed.setHours(0, 0, 0, 0);
      endDateISO = parsed.toISOString();
    } else {
      // permitir borrar fecha
      endDateISO = null;
    }

    await updateProfile(accountId, profileId, {
      name: editData.name,
      pin: editData.pin?.trim() ? editData.pin.trim() : null,
      clientId: editData.clientId?.trim() ? editData.clientId.trim() : null,
      phone: editData.phone?.trim() ? editData.phone.trim() : null,
      price: editData.price === '' ? null : Number(editData.price),
      endDate: endDateISO,
    });

    setEditingId(null);
  };

  const handleDeleteProfile = async () => {
    if (deleteConfirm.accountId && deleteConfirm.profileId) {
      await deleteProfile(deleteConfirm.accountId, deleteConfirm.profileId);
      setDeleteConfirm({ open: false, accountId: '', profileId: '', name: '' });
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return 'Sin asignar';
    return clientsSafe.find((c) => c.id === clientId)?.name || 'Desconocido';
  };

  const totalActiveProfiles = useMemo(() => {
    return accountsSafe.reduce((sum, a: any) => {
      const profiles = a?.profiles ?? [];
      return sum + profiles.filter((p: any) => p.status !== 'disponible').length;
    }, 0);
  }, [accountsSafe]);

  const statusBadge = (daysLeft: number | null) => {
    if (typeof daysLeft !== 'number') return <Badge className="bg-white/10 text-muted-foreground">Sin fecha</Badge>;

    const cls =
      daysLeft > 5
        ? 'bg-emerald-500/20 text-emerald-400'
        : daysLeft > 1
        ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-red-500/20 text-red-400';

    return <Badge className={cls}>{daysLeft}d</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Perfiles</h1>
        <p className="text-muted-foreground">Gestiona tus perfiles activos organizados por cuenta maestra.</p>
      </div>

      <div className="space-y-4">
        {accountsSafe.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No hay cuentas maestras</h3>
              <p className="text-muted-foreground text-center">
                Primero debes crear una cuenta maestra desde la sección "Cuentas" para poder gestionar perfiles.
              </p>
            </CardContent>
          </Card>
        ) : totalActiveProfiles === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No hay perfiles activos</h3>
              <p className="text-muted-foreground text-center">
                Aún no has vendido ningún perfil. Ve a la sección "Ventas" para asignar perfiles a tus clientes.
              </p>
            </CardContent>
          </Card>
        ) : (
          accountsSafe.map((account: any) => {
            const accountProfiles = (account?.profiles ?? []).filter((p: any) => p.status !== 'disponible');
            const isExpanded = expandedAccount === account.id;
            if (accountProfiles.length === 0) return null;

            const baseServiceName = getBaseServiceNameForAccount(account);
            const serviceDisplayName = getServiceDisplayNameForAccount(account);
            const serviceColor = getServiceColorForAccount(account);
            const serviceImage = getServiceImageForAccount(account);

            return (
              <motion.div key={account.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass-card" data-testid={`card-account-profiles-${account.id}`}>
                  <CardHeader className="bg-white/5 border-b border-white/5 py-3">
                    <div
                      className="flex justify-between items-center cursor-pointer hover:bg-white/5 px-2 py-1.5 rounded transition-colors"
                      onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center font-bold text-white text-sm shrink-0"
                          style={{ backgroundColor: serviceColor }}
                        >
                          {serviceImage ? (
                            <img
                              src={serviceImage}
                              alt={serviceDisplayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            String(serviceDisplayName || baseServiceName || '').substring(0, 1)
                          )}
                        </div>

                        <div className="min-w-0">
                          <CardTitle className="text-base text-white truncate">{serviceDisplayName}</CardTitle>
                          <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                          {accountProfiles.length}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-4">
                      <div className="rounded-lg border border-white/10 overflow-hidden">
                        <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-white/5 text-[11px] text-muted-foreground">
                          <div className="col-span-3">Perfil / Cliente</div>
                          <div className="col-span-2">Teléfono</div>
                          <div className="col-span-2">PIN</div>
                          <div className="col-span-2">Precio</div>
                          <div className="col-span-1 text-center">Vence</div>
                          <div className="col-span-2 text-right">Acciones</div>
                        </div>

                        <div className="divide-y divide-white/10">
                          {accountProfiles.map((profile: any) => {
                            const end = safeDate(profile.endDate);
                            const daysLeft = end ? differenceInDays(end, new Date()) : null;

                            const canRenew = typeof daysLeft === 'number' && daysLeft <= 1;
                            const isEditing = editingId === profile.id + account.id;

                            return (
                              <div key={profile.id} className="px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors">
                                {isEditing ? (
                                  <div className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center">
                                    <div className="col-span-2 md:col-span-3">
                                      <label className="text-[10px] text-muted-foreground">Nombre</label>
                                      <Input
                                        className="glass-input h-9"
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                      />
                                    </div>

                                    <div className="col-span-1 md:col-span-2">
                                      <label className="text-[10px] text-muted-foreground">Teléfono</label>
                                      <Input
                                        className="glass-input h-9"
                                        value={editData.phone}
                                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                      />
                                    </div>

                                    <div className="col-span-1 md:col-span-2">
                                      <label className="text-[10px] text-muted-foreground">PIN</label>
                                      <Input
                                        className="glass-input h-9"
                                        value={editData.pin}
                                        onChange={(e) => setEditData({ ...editData, pin: e.target.value })}
                                      />
                                    </div>

                                    <div className="col-span-1 md:col-span-2">
                                      <label className="text-[10px] text-muted-foreground">Precio</label>
                                      <Input
                                        type="number"
                                        className="glass-input h-9"
                                        placeholder="Ej: 25"
                                        value={editData.price}
                                        onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                                      />
                                    </div>

                                    {/* ✅ NUEVO: Vencimiento editable */}
                                    <div className="col-span-1 md:col-span-2">
                                      <label className="text-[10px] text-muted-foreground">Vence (dd/MM/aaaa)</label>
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={10}
                                        className="glass-input h-9"
                                        placeholder="31/01/2026"
                                        value={editData.endDate}
                                        onChange={(e) => setEditData({ ...editData, endDate: formatDDMMYYYY(e.target.value) })}
                                      />
                                    </div>

                                    <div className="col-span-1 md:col-span-1 flex md:justify-center">
                                      {statusBadge(daysLeft)}
                                    </div>

                                    <div className="col-span-2 md:col-span-12 flex gap-2 justify-end pt-1">
                                      <Button
                                        onClick={() => handleSave(account.id, profile.id)}
                                        className="bg-primary hover:bg-primary/90 text-white h-8 px-3 text-sm"
                                      >
                                        Guardar
                                      </Button>
                                      <Button
                                        onClick={() => setEditingId(null)}
                                        variant="outline"
                                        className="border-white/10 hover:bg-white/5 text-white h-8 px-3 text-sm"
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-7 md:col-span-3 min-w-0">
                                      <p className="text-sm text-white font-medium truncate">{profile.name}</p>
                                      <p className="text-[11px] text-muted-foreground truncate">{getClientName(profile.clientId)}</p>
                                    </div>

                                    <div className="hidden md:block md:col-span-2 min-w-0">
                                      <p className="text-xs text-white truncate">{profile.phone || '—'}</p>
                                    </div>

                                    <div className="hidden md:block md:col-span-2">
                                      <p className="text-xs text-white font-mono">{profile.pin || '—'}</p>
                                    </div>

                                    <div className="hidden md:block md:col-span-2">
                                      <p className="text-xs text-white font-medium">{money(profile.price)}</p>
                                    </div>

                                    <div className="col-span-2 md:col-span-1 flex justify-end md:justify-center">
                                      {statusBadge(daysLeft)}
                                    </div>

                                    <div className="col-span-3 md:col-span-2 flex justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEdit(profile, account.id)}
                                        className="h-8 w-8 p-0 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400"
                                        title="Editar"
                                        data-testid={`button-edit-profile-${profile.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>

                                      {canRenew && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => renewProfile(account.id, profile.id, profile.price || 5)}
                                          className="h-8 w-8 p-0 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400"
                                          title="Renovar"
                                          data-testid={`button-renew-profile-${profile.id}`}
                                        >
                                          <RotateCw className="h-4 w-4" />
                                        </Button>
                                      )}

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          setDeleteConfirm({
                                            open: true,
                                            accountId: account.id,
                                            profileId: profile.id,
                                            name: profile.name,
                                          })
                                        }
                                        className="h-8 w-8 p-0 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400"
                                        title="Eliminar"
                                        data-testid={`button-delete-profile-${profile.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <div className="col-span-12 md:hidden flex gap-3 text-[11px] text-muted-foreground">
                                      <span className="truncate">
                                        <span className="text-white">Tel:</span> {profile.phone || '—'}
                                      </span>
                                      <span className="truncate">
                                        <span className="text-white">PIN:</span> <span className="font-mono text-white">{profile.pin || '—'}</span>
                                      </span>
                                      <span className="truncate">
                                        <span className="text-white">Precio:</span> <span className="text-white font-medium">{money(profile.price)}</span>
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title={`¿Eliminar perfil "${deleteConfirm.name}"?`}
        description="Se eliminará el perfil y todos sus registros financieros asociados. El perfil quedará disponible para ser vendido nuevamente. Esta acción no se puede deshacer."
        confirmText="Eliminar Perfil"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteProfile}
      />
    </motion.div>
  );
}
