import { useStreaming, Account, ServiceType } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, User } from 'lucide-react';
import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function Accounts() {
  const { accounts, addAccount, clients, getMaxProfilesByService, services, updateProfile, deleteAccount } = useStreaming();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<{ accountId: number; profile: any } | null>(null);
  const [editData, setEditData] = useState({ name: '', pin: '', clientId: '', phone: '', price: '' });
  const [newAccount, setNewAccount] = useState({
    serviceName: 'Netflix',
    totalProfiles: 5,
    isRenewable: true,
    email: '',
    password: '',
    cost: '',
    pricePerProfile: ''
  });

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          acc.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = filterService === 'all' || acc.serviceName === filterService;
    return matchesSearch && matchesService;
  });

  const handleAddAccount = async () => {
    if (!newAccount.email || !newAccount.cost) return;

    const success = await addAccount({
      serviceName: newAccount.serviceName as ServiceType,
      email: newAccount.email,
      password: newAccount.password,
      totalProfiles: newAccount.totalProfiles,
      startDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isRenewable: newAccount.isRenewable,
      cost: newAccount.cost,
      pricePerProfile: newAccount.pricePerProfile
    });
    
    if (success) {
      setIsAddOpen(false);
      setNewAccount({
        serviceName: 'Netflix',
        totalProfiles: 5,
        isRenewable: true,
        email: '',
        password: '',
        cost: '',
        pricePerProfile: ''
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!editingProfile) return;
    await updateProfile(editingProfile.accountId, editingProfile.profile.id, { 
      name: editData.name, 
      pin: editData.pin || undefined, 
      clientId: editData.clientId ? parseInt(editData.clientId) : undefined, 
      phone: editData.phone || undefined, 
      price: editData.price || undefined 
    }); 
    setEditingProfile(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2" data-testid="text-page-title">Cuentas Maestras</h1>
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
                    onValueChange={(val) => setNewAccount({...newAccount, serviceName: val})}
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
                    Perfiles (Máx: {getMaxProfilesByService(newAccount.serviceName)})
                  </label>
                  <Input 
                    type="number" 
                    className="glass-input" 
                    value={newAccount.totalProfiles} 
                    onChange={e => setNewAccount({...newAccount, totalProfiles: parseInt(e.target.value) || 5})}
                    max={getMaxProfilesByService(newAccount.serviceName)}
                    data-testid="input-total-profiles"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Email de la cuenta</label>
                <Input 
                  className="glass-input" 
                  placeholder="ejemplo@correo.com"
                  value={newAccount.email} 
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
                  value={newAccount.password} 
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
                    value={newAccount.cost} 
                    onChange={e => setNewAccount({...newAccount, cost: e.target.value})}
                    data-testid="input-account-cost"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Precio/Perfil ($)</label>
                  <Input 
                    type="number" 
                    className="glass-input" 
                    value={newAccount.pricePerProfile} 
                    onChange={e => setNewAccount({...newAccount, pricePerProfile: e.target.value})}
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
          <SelectTrigger className="w-[180px] glass-input bg-background/20" data-testid="select-filter-service">
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
                    <Badge variant={daysLeft < 3 ? "destructive" : "default"} className={`${daysLeft >= 3 ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : ''}`}>
                      {daysLeft} días
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm(`¿Eliminar la cuenta ${account.serviceName} (${account.email}) y todos sus perfiles? Esta acción no se puede deshacer.`)) {
                          deleteAccount(account.id);
                        }
                      }}
                      className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 h-8 text-xs ml-2"
                      data-testid={`button-delete-account-${account.id}`}
                    >
                      Eliminar Cuenta
                    </Button>
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
                    {account.profiles?.map((profile) => (
                      <div 
                        key={profile.id} 
                        className="flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-sm group/profile cursor-pointer"
                        onClick={() => {
                          if (profile.status === 'activo') {
                            setEditingProfile({ accountId: account.id, profile });
                            setEditData({ 
                              name: profile.name, 
                              pin: profile.pin || '', 
                              clientId: profile.clientId ? profile.clientId.toString() : '', 
                              phone: profile.phone || '',
                              price: profile.price || ''
                            });
                          }
                        }}
                        data-testid={`card-profile-${profile.id}`}
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

      {editingProfile && (
        <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Perfil: {editingProfile.profile.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <Input className="glass-input" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} data-testid="input-profile-name" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Teléfono</label>
                <Input className="glass-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} data-testid="input-profile-phone" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">PIN</label>
                <Input className="glass-input" value={editData.pin} onChange={e => setEditData({...editData, pin: e.target.value})} data-testid="input-profile-pin" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Cliente</label>
                <Select value={editData.clientId} onValueChange={val => setEditData({...editData, clientId: val})}>
                  <SelectTrigger className="glass-input" data-testid="select-profile-client"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    <SelectItem value="">Sin asignar</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Precio</label>
                <Input type="number" className="glass-input" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} data-testid="input-profile-price" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProfile(null)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
              <Button onClick={handleSaveProfile} className="bg-primary text-white" data-testid="button-save-profile">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
