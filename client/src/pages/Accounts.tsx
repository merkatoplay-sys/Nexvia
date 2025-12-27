import { useStreaming, Account, ServiceType } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, User, MonitorPlay } from 'lucide-react';
import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function Accounts() {
  const { accounts, addAccount, clients, updateProfile, deleteAccount, getMaxProfilesByService, services } = useStreaming();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<{ accountId: string; profile: any } | null>(null);
  const [editData, setEditData] = useState({ name: '', pin: '', clientId: '', phone: '', price: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string; email: string }>({ open: false, id: '', name: '', email: '' });
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    serviceName: 'Netflix',
    totalProfiles: 5,
    isRenewable: true,
    profiles: []
  });

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          acc.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = filterService === 'all' || acc.serviceName === filterService;
    return matchesSearch && matchesService;
  });

  const handleAddAccount = () => {
    if (!newAccount.email || !newAccount.cost) return;

    const profiles = Array.from({ length: newAccount.totalProfiles || 5 }, (_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `Disponible`,
      status: 'disponible' as const
    }));

    const success = addAccount({
      serviceName: newAccount.serviceName as ServiceType || 'Netflix',
      email: newAccount.email || '',
      password: newAccount.password || '',
      totalProfiles: newAccount.totalProfiles || 5,
      profiles,
      startDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isRenewable: newAccount.isRenewable || true,
      cost: Number(newAccount.cost) || 0,
      pricePerProfile: Number(newAccount.pricePerProfile) || 0
    });
    
    if (success) {
      setIsAddOpen(false);
      setNewAccount({
        serviceName: 'Netflix',
        totalProfiles: 5,
        isRenewable: true,
        profiles: []
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm.id) {
      await deleteAccount(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: '', name: '', email: '' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Cuentas Maestras</h1>
          <p className="text-muted-foreground">Gestiona tus suscripciones y distribuye perfiles.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]" data-testid="button-add-account">
              <Plus className="mr-2 h-4 w-4" /> Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Cuenta</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Servicio</label>
                  <Select 
                    onValueChange={(val) => setNewAccount({...newAccount, serviceName: val as ServiceType})}
                    defaultValue="Netflix"
                  >
                    <SelectTrigger className="glass-input" data-testid="select-service">
                      <SelectValue placeholder="Servicio" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {services.filter(s => s.name && s.name.trim()).map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Perfiles (Máx: {getMaxProfilesByService((newAccount.serviceName as ServiceType) || 'Netflix')})
                  </label>
                  <Input 
                    type="number" 
                    className="glass-input" 
                    value={newAccount.totalProfiles} 
                    onChange={e => setNewAccount({...newAccount, totalProfiles: parseInt(e.target.value)})}
                    max={getMaxProfilesByService((newAccount.serviceName as ServiceType) || 'Netflix')}
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
                  onChange={e => setNewAccount({...newAccount, email: e.target.value})}
                  data-testid="input-account-email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Contraseña</label>
                <Input 
                  className="glass-input" 
                  type="password"
                  placeholder="••••••••"
                  value={newAccount.password || ''} 
                  onChange={e => setNewAccount({...newAccount, password: e.target.value})}
                  data-testid="input-account-password"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Costo ($)</label>
                  <Input 
                    type="number" 
                    className="glass-input" 
                    value={newAccount.cost || ''} 
                    onChange={e => setNewAccount({...newAccount, cost: parseFloat(e.target.value)})}
                    data-testid="input-account-cost"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Precio/Perfil ($)</label>
                  <Input 
                    type="number" 
                    className="glass-input" 
                    value={newAccount.pricePerProfile || ''} 
                    onChange={e => setNewAccount({...newAccount, pricePerProfile: parseFloat(e.target.value)})}
                    data-testid="input-price-per-profile"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
              <Button onClick={handleAddAccount} className="bg-primary text-white" data-testid="button-save-account">Guardar Cuenta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center bg-card/40 p-4 rounded-lg border border-white/5 backdrop-blur-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 glass-input bg-background/20" 
            placeholder="Buscar por email..." 
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
            {services.map(s => (
              <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {accounts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MonitorPlay className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No hay cuentas maestras</h3>
            <p className="text-muted-foreground text-center mb-6">
              Registra tu primera cuenta de streaming para comenzar a distribuir perfiles.
            </p>
            <Button 
              onClick={() => setIsAddOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
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
          {filteredAccounts.map((account) => {
            const daysLeft = differenceInDays(new Date(account.expirationDate), new Date());
            
            return (
              <motion.div 
                key={account.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="glass-card overflow-hidden group hover:border-primary/30 transition-all duration-300" data-testid={`card-account-${account.id}`}>
                  <CardHeader className="bg-white/5 border-b border-white/5 pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-lg
                            ${account.serviceName === 'Netflix' ? 'bg-red-600' : 
                              account.serviceName === 'Spotify' ? 'bg-green-500' : 
                              account.serviceName === 'Disney+' ? 'bg-blue-600' : 'bg-primary'}`}>
                            {account.serviceName.substring(0, 1)}
                        </div>
                        <div>
                          <CardTitle className="text-lg text-white">{account.serviceName}</CardTitle>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{account.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={daysLeft < 3 ? "destructive" : "default"} className={`${daysLeft >= 3 ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : ''}`}>
                          {daysLeft} días
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirm({ open: true, id: account.id, name: account.serviceName, email: account.email })}
                          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 h-8 text-xs"
                          data-testid={`button-delete-account-${account.id}`}
                        >
                          Eliminar
                        </Button>
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
                          <span className="text-xs font-medium text-white">{format(new Date(account.expirationDate), 'dd MMM')}</span>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Perfiles</h4>
                      {account.profiles.map((profile) => (
                        <div 
                          key={profile.id} 
                          className="flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-sm group/profile cursor-pointer"
                          onClick={() => {
                            if (profile.status === 'activo') {
                              setEditingProfile({ accountId: account.id, profile });
                              setEditData({ 
                                name: profile.name, 
                                pin: profile.pin || '', 
                                clientId: profile.clientId || '', 
                                phone: profile.phone || '',
                                price: profile.price || 0
                              });
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <User className={`h-3 w-3 ${profile.status === 'activo' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`${profile.status === 'disponible' ? 'text-muted-foreground italic' : 'text-white'}`}>
                              {profile.name}
                            </span>
                          </div>
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

      {editingProfile && (
        <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Perfil: {editingProfile.profile.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <Input className="glass-input" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Teléfono</label>
                <Input className="glass-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">PIN</label>
                <Input className="glass-input" value={editData.pin} onChange={e => setEditData({...editData, pin: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Cliente</label>
                <Select value={editData.clientId} onValueChange={val => setEditData({...editData, clientId: val})}>
                  <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    <SelectItem value="">Sin asignar</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Precio</label>
                <Input type="number" className="glass-input" value={editData.price} onChange={e => setEditData({...editData, price: parseFloat(e.target.value)})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProfile(null)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
              <Button onClick={() => { updateProfile(editingProfile.accountId, editingProfile.profile.id, { name: editData.name, pin: editData.pin || undefined, clientId: editData.clientId || undefined, phone: editData.phone || undefined, price: editData.price || undefined }); setEditingProfile(null); }} className="bg-primary text-white">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title={`¿Eliminar cuenta "${deleteConfirm.name}"?`}
        description={`Se eliminará la cuenta ${deleteConfirm.email} junto con todos sus perfiles y registros financieros asociados. Esta acción no se puede deshacer.`}
        confirmText="Eliminar Cuenta"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
