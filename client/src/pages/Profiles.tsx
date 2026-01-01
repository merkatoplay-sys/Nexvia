import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Edit, RotateCw, Trash2, ChevronDown, ChevronUp, Users, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

function safeDate(value: any): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default function Profiles() {
  const { accounts, clients, updateProfile, renewProfile, deleteProfile } = useStreaming();

  // ✅ SAFE: evita crashes si vienen undefined
  const accountsSafe = accounts ?? [];
  const clientsSafe = clients ?? [];

  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ✅ price como string para evitar NaN y problemas de input controlado
  const [editData, setEditData] = useState({
    name: '',
    pin: '',
    clientId: '',
    phone: '',
    price: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    accountId: string;
    profileId: string;
    name: string;
  }>({ open: false, accountId: '', profileId: '', name: '' });

  // ✅ mostrar/ocultar PIN por perfil
  const [pinVisible, setPinVisible] = useState<Record<string, boolean>>({});

  const togglePin = (key: string) => {
    setPinVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEdit = (profile: any, accountId: string) => {
    setEditingId(profile.id + accountId);
    setEditData({
      name: profile.name ?? '',
      pin: profile.pin ?? '',
      clientId: profile.clientId ?? '',
      phone: profile.phone ?? '',
      price: profile.price != null ? String(profile.price) : '',
    });
  };

  const handleSave = async (accountId: string, profileId: string) => {
    await updateProfile(accountId, profileId, {
      name: editData.name,
      pin: editData.pin?.trim() ? editData.pin.trim() : null,
      clientId: editData.clientId?.trim() ? editData.clientId.trim() : null,
      phone: editData.phone?.trim() ? editData.phone.trim() : null,
      price: editData.price === '' ? null : Number(editData.price),
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
    return clientsSafe.find(c => c.id === clientId)?.name || 'Desconocido';
  };

  // ✅ SAFE: account.profiles puede venir undefined
  const totalActiveProfiles = useMemo(() => {
    return accountsSafe.reduce((sum, a: any) => {
      const profiles = a?.profiles ?? [];
      return sum + profiles.filter((p: any) => p.status !== 'disponible').length;
    }, 0);
  }, [accountsSafe]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
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

            return (
              <motion.div key={account.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass-card" data-testid={`card-account-profiles-${account.id}`}>
                  <CardHeader className="bg-white/5 border-b border-white/5">
                    <div
                      className="flex justify-between items-center cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
                      onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                          style={{
                            backgroundColor:
                              account.serviceName === 'Netflix'
                                ? '#E50914'
                                : account.serviceName === 'Spotify'
                                ? '#1DB954'
                                : '#7B68EE',
                          }}
                        >
                          {String(account.serviceName ?? '').substring(0, 1)}
                        </div>
                        <div>
                          <CardTitle className="text-lg text-white">{account.serviceName}</CardTitle>
                          <p className="text-xs text-muted-foreground">{account.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                          {accountProfiles.length} perfil{accountProfiles.length !== 1 ? 'es' : ''}
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
                    <CardContent className="pt-4 space-y-4">
                      {accountProfiles.map((profile: any) => {
                        const key = `${account.id}_${profile.id}`;
                        const end = safeDate(profile.endDate);

                        // ✅ NO crashea: si end es null, daysLeft = null
                        const daysLeft = end ? differenceInDays(end, new Date()) : null;

                        const canRenew = typeof daysLeft === 'number' && daysLeft <= 1;
                        const isEditing = editingId === profile.id + account.id;

                        return (
                          <motion.div
                            key={profile.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4"
                            data-testid={`card-profile-${profile.id}`}
                          >
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Nombre del Perfil</label>
                                    <Input
                                      className="glass-input"
                                      value={editData.name}
                                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Nombre</p>
                                    <p className="text-lg font-medium text-white">{profile.name}</p>
                                  </div>
                                )}

                                {isEditing ? (
                                  <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Teléfono</label>
                                    <Input
                                      className="glass-input"
                                      value={editData.phone}
                                      onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                                    <p className="text-sm text-white">{profile.phone || 'No especificado'}</p>
                                  </div>
                                )}

                                {/* ✅ PIN visible (con toggle) */}
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">PIN</label>
                                    <Input
                                      className="glass-input"
                                      value={editData.pin}
                                      onChange={e => setEditData({ ...editData, pin: e.target.value })}
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs text-muted-foreground mb-1">PIN</p>
                                      {profile.pin ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
                                          onClick={() => togglePin(key)}
                                          title={pinVisible[key] ? 'Ocultar PIN' : 'Ver PIN'}
                                        >
                                          {pinVisible[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                      ) : null}
                                    </div>

                                    <p className="text-sm text-white">
                                      {profile.pin ? (pinVisible[key] ? profile.pin : '••••') : 'No configurado'}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Cliente Asignado</label>
                                    <Select
                                      value={editData.clientId}
                                      onValueChange={val => setEditData({ ...editData, clientId: val })}
                                    >
                                      <SelectTrigger className="glass-input">
                                        <SelectValue placeholder="Seleccionar cliente" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover border-white/10 text-white">
                                        <SelectItem value="">Sin asignar</SelectItem>
                                        {clientsSafe.map(c => (
                                          <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                                    <p className="text-sm text-white">{getClientName(profile.clientId)}</p>
                                  </div>
                                )}

                                {isEditing ? (
                                  <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Precio</label>
                                    <Input
                                      type="number"
                                      className="glass-input"
                                      value={editData.price}
                                      onChange={e => setEditData({ ...editData, price: e.target.value })}
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Precio</p>
                                    <p className="text-sm font-medium text-white">
                                      ${profile.price != null ? profile.price : 0}
                                    </p>
                                  </div>
                                )}

                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Estado</p>
                                  {typeof daysLeft === 'number' ? (
                                    <Badge
                                      className={
                                        daysLeft > 5
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : daysLeft > 1
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-red-500/20 text-red-400'
                                      }
                                    >
                                      {daysLeft} días
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-white/10 text-muted-foreground">Sin fecha</Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 flex-wrap pt-2 border-t border-white/5">
                              {isEditing ? (
                                <>
                                  <Button
                                    onClick={() => handleSave(account.id, profile.id)}
                                    className="bg-primary hover:bg-primary/90 text-white h-8 text-sm"
                                  >
                                    Guardar Cambios
                                  </Button>
                                  <Button
                                    onClick={() => setEditingId(null)}
                                    variant="outline"
                                    className="border-white/10 hover:bg-white/5 text-white h-8 text-sm"
                                  >
                                    Cancelar
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => handleEdit(profile, account.id)}
                                    className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 h-8 text-sm"
                                    data-testid={`button-edit-profile-${profile.id}`}
                                  >
                                    <Edit className="h-3 w-3 mr-1" /> Editar
                                  </Button>

                                  {canRenew && (
                                    <Button
                                      onClick={() => renewProfile(account.id, profile.id, profile.price || 5)}
                                      className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 h-8 text-sm"
                                      data-testid={`button-renew-profile-${profile.id}`}
                                    >
                                      <RotateCw className="h-3 w-3 mr-1" /> Renovar
                                    </Button>
                                  )}

                                  <Button
                                    onClick={() =>
                                      setDeleteConfirm({
                                        open: true,
                                        accountId: account.id,
                                        profileId: profile.id,
                                        name: profile.name,
                                      })
                                    }
                                    className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 h-8 text-sm"
                                    data-testid={`button-delete-profile-${profile.id}`}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                                  </Button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
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
        onOpenChange={open => setDeleteConfirm({ ...deleteConfirm, open })}
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
