import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, RotateCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function Profiles() {
  const { getAllProfiles, accounts, clients, updateProfile, renewProfile, getServiceColor, deleteProfile } = useStreaming();
  const allProfiles = getAllProfiles();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', pin: '', clientId: '', phone: '' });

  const handleEdit = (profile: any) => {
    setEditingId(profile.id + profile.accountId);
    setEditData({ name: profile.name, pin: profile.pin || '', clientId: profile.clientId || '', phone: profile.phone || '' });
  };

  const handleSave = (accountId: string, profileId: string) => {
    updateProfile(accountId, profileId, {
      name: editData.name,
      pin: editData.pin || undefined,
      clientId: editData.clientId || undefined,
      phone: editData.phone || undefined
    });
    setEditingId(null);
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return 'Sin asignar';
    return clients.find(c => c.id === clientId)?.name || 'Desconocido';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Perfiles</h1>
        <p className="text-muted-foreground">Gestiona todos tus perfiles activos y vigentes.</p>
      </div>

      <div className="grid gap-4">
        {allProfiles.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="pt-8 text-center">
              <p className="text-muted-foreground">No hay perfiles activos</p>
            </CardContent>
          </Card>
        ) : (
          allProfiles.map((profile) => {
            const daysLeft = profile.endDate ? differenceInDays(new Date(profile.endDate), new Date()) : 0;
            const canRenew = daysLeft <= 1;
            const account = accounts.find(a => a.id === profile.accountId);

            return (
              <motion.div
                key={`${profile.accountId}-${profile.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Información Principal */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Servicio</p>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: getServiceColor(profile.accountName) }}
                            />
                            <p className="text-sm font-medium text-white">{profile.accountName}</p>
                          </div>
                        </div>

                        {editingId === `${profile.id}${profile.accountId}` ? (
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

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                          <p className="text-sm text-white">{profile.phone || 'No especificado'}</p>
                        </div>

                        {editingId === `${profile.id}${profile.accountId}` ? (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs text-muted-foreground">Teléfono</label>
                              <Input
                                className="glass-input"
                                value={editData.phone}
                                onChange={e => setEditData({...editData, phone: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs text-muted-foreground">PIN</label>
                              <Input
                                className="glass-input"
                                placeholder="Dejar en blanco para no cambiar"
                                value={editData.pin}
                                onChange={e => setEditData({...editData, pin: e.target.value})}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                              <p className="text-sm text-white">{editData.phone || profile.phone || 'No especificado'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">PIN</p>
                              <p className="text-sm text-white">{profile.pin ? '••••' : 'No configurado'}</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Información de Cliente y Fechas */}
                      <div className="space-y-4">
                        {editingId === `${profile.id}${profile.accountId}` ? (
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

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Cuenta Maestra</p>
                          <p className="text-sm text-white">{profile.accountName}</p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Estado</p>
                          <Badge className={
                            daysLeft > 5 ? 'bg-emerald-500/20 text-emerald-400' :
                            daysLeft > 1 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }>
                            {daysLeft} días restantes
                          </Badge>
                        </div>

                        {profile.endDate && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Vence</p>
                            <p className="text-sm text-white">{format(new Date(profile.endDate), 'dd MMM yyyy')}</p>
                          </div>
                        )}

                        {profile.price && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Precio</p>
                            <p className="text-sm text-white font-medium">${profile.price}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="mt-6 flex gap-2 flex-wrap">
                      {editingId === `${profile.id}${profile.accountId}` ? (
                        <>
                          <Button
                            onClick={() => handleSave(profile.accountId as string, profile.id)}
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
                            onClick={() => handleEdit(profile)}
                            className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 h-8 text-sm"
                          >
                            <Edit className="h-3 w-3 mr-1" /> Editar
                          </Button>
                          {canRenew && (
                            <Button
                              onClick={() => renewProfile(profile.accountId as string, profile.id, profile.price || 5)}
                              className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 h-8 text-sm"
                            >
                              <RotateCw className="h-3 w-3 mr-1" /> Renovar
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              if (confirm(`¿Eliminar perfil ${profile.name}?`)) {
                                deleteProfile(profile.accountId as string, profile.id);
                              }
                            }}
                            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 h-8 text-sm"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
