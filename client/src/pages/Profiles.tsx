import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, RotateCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function Profiles() {
  const { accounts, clients, updateProfile, renewProfile, deleteProfile, getServiceColor } = useStreaming();
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', pin: '', clientId: '', phone: '', price: 0 });
  const [editingPrice, setEditingPrice] = useState(false);

  const handleEdit = (profile: any, accountId: string) => {
    setEditingId(profile.id + accountId);
    setEditData({ 
      name: profile.name, 
      pin: profile.pin || '', 
      clientId: profile.clientId || '', 
      phone: profile.phone || '',
      price: profile.price || 0
    });
  };

  const handleSave = (accountId: string, profileId: string) => {
    updateProfile(accountId, profileId, {
      name: editData.name,
      pin: editData.pin || undefined,
      clientId: editData.clientId || undefined,
      phone: editData.phone || undefined,
      price: editData.price || undefined
    });
    setEditingId(null);
    setEditingPrice(false);
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return 'Sin asignar';
    return clients.find(c => c.id === clientId)?.name || 'Desconocido';
  };

  const activeProfiles = accounts.flatMap(a => a.profiles.filter(p => p.status !== 'disponible').map(p => ({ ...p, accountId: a.id, accountName: a.serviceName })));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Perfiles</h1>
        <p className="text-muted-foreground">Gestiona tus perfiles activos organizados por cuenta maestra.</p>
      </div>

      <div className="space-y-4">
        {accounts.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="pt-8 text-center">
              <p className="text-muted-foreground">No hay cuentas maestras</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => {
            const accountProfiles = account.profiles.filter(p => p.status !== 'disponible');
            const isExpanded = expandedAccount === account.id;

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass-card">
                  <CardHeader className="bg-white/5 border-b border-white/5">
                    <div 
                      className="flex justify-between items-center cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
                      onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                          style={{ backgroundColor: account.serviceName === 'Netflix' ? '#E50914' : account.serviceName === 'Spotify' ? '#1DB954' : '#7B68EE' }}
                        >
                          {account.serviceName.substring(0, 1)}
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
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-4 space-y-4">
                      {accountProfiles.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No hay perfiles activos en esta cuenta</p>
                      ) : (
                        accountProfiles.map((profile) => {
                          const daysLeft = profile.endDate ? differenceInDays(new Date(profile.endDate), new Date()) : 0;
                          const canRenew = daysLeft <= 1;
                          const isEditing = editingId === profile.id + account.id;

                          return (
                            <motion.div
                              key={profile.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4"
                            >
                              <div className="grid md:grid-cols-2 gap-4">
                                {/* Columna 1 */}
                                <div className="space-y-3">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <label className="text-xs text-muted-foreground">Nombre del Perfil</label>
                                      <Input
                                        className="glass-input"
                                        value={editData.name}
                                        onChange={e => setEditData({...editData, name: e.target.value})}
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
                                        onChange={e => setEditData({...editData, phone: e.target.value})}
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                                      <p className="text-sm text-white">{profile.phone || 'No especificado'}</p>
                                    </div>
                                  )}

                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <label className="text-xs text-muted-foreground">PIN</label>
                                      <Input
                                        className="glass-input"
                                        value={editData.pin}
                                        onChange={e => setEditData({...editData, pin: e.target.value})}
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">PIN</p>
                                      <p className="text-sm text-white">{profile.pin ? '••••' : 'No configurado'}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Columna 2 */}
                                <div className="space-y-3">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <label className="text-xs text-muted-foreground">Cliente Asignado</label>
                                      <Select value={editData.clientId} onValueChange={val => setEditData({...editData, clientId: val})}>
                                        <SelectTrigger className="glass-input">
                                          <SelectValue placeholder="Seleccionar cliente" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-white/10 text-white">
                                          <SelectItem value="">Sin asignar</SelectItem>
                                          {clients.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                                        onChange={e => setEditData({...editData, price: parseFloat(e.target.value)})}
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Precio</p>
                                      <p className="text-sm font-medium text-white">${profile.price || '0'}</p>
                                    </div>
                                  )}

                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Estado</p>
                                    <Badge className={
                                      daysLeft > 5 ? 'bg-emerald-500/20 text-emerald-400' :
                                      daysLeft > 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-red-500/20 text-red-400'
                                    }>
                                      {daysLeft} días
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Botones de Acción */}
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
                                    >
                                      <Edit className="h-3 w-3 mr-1" /> Editar
                                    </Button>
                                    {canRenew && (
                                      <Button
                                        onClick={() => renewProfile(account.id, profile.id, profile.price || 5)}
                                        className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 h-8 text-sm"
                                      >
                                        <RotateCw className="h-3 w-3 mr-1" /> Renovar
                                      </Button>
                                    )}
                                    <Button
                                      onClick={() => {
                                        if (confirm(`¿Eliminar perfil ${profile.name}?`)) {
                                          deleteProfile(account.id, profile.id);
                                        }
                                      }}
                                      className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 h-8 text-sm"
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
