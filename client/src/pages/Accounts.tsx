import { useStreaming, Account, ServiceType } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Calendar, User, MoreVertical, CreditCard, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function Accounts() {
  const { accounts, addAccount, clients, sellProfile, renewProfile, getMaxProfilesByService, services, addService } = useStreaming();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState<string>('all');
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', color: '#7B68EE', maxProfiles: 7 });
  
  // New Account Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
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
    // Basic validation
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
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Cuentas Maestras</h1>
          <p className="text-muted-foreground">Gestiona tus suscripciones y distribuye perfiles.</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Crear Servicio Personalizado</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Nombre del Servicio</label>
                  <Input 
                    className="glass-input" 
                    placeholder="Mi Servicio"
                    value={newService.name} 
                    onChange={e => setNewService({...newService, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={newService.color}
                      onChange={e => setNewService({...newService, color: e.target.value})}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input 
                      className="glass-input" 
                      placeholder="#7B68EE"
                      value={newService.color} 
                      onChange={e => setNewService({...newService, color: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Máximo de Perfiles</label>
                  <Input 
                    type="number" 
                    className="glass-input" 
                    value={newService.maxProfiles} 
                    onChange={e => setNewService({...newService, maxProfiles: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddServiceOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
                <Button onClick={() => {
                  if (!newService.name.trim()) {
                    alert('Por favor ingresa un nombre para el servicio');
                    return;
                  }
                  if (addService({ name: newService.name, color: newService.color, maxProfiles: newService.maxProfiles, isCustom: true })) {
                    setIsAddServiceOpen(false);
                    setNewService({ name: '', color: '#7B68EE', maxProfiles: 7 });
                  }
                }} className="bg-primary text-white">Crear Servicio</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]">
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
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Servicio" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {services.map(s => (
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
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Precio/Perfil ($)</label>
                  <Input 
                    type="number" 
                    className="glass-input" 
                    value={newAccount.pricePerProfile || ''} 
                    onChange={e => setNewAccount({...newAccount, pricePerProfile: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
              <Button onClick={handleAddAccount} className="bg-primary text-white">Guardar Cuenta</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-card/40 p-4 rounded-lg border border-white/5 backdrop-blur-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 glass-input bg-background/20" 
            placeholder="Buscar por email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="w-[180px] glass-input bg-background/20">
            <SelectValue placeholder="Filtrar Servicio" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-white/10 text-white">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Netflix">Netflix</SelectItem>
            <SelectItem value="Spotify">Spotify</SelectItem>
            <SelectItem value="Disney+">Disney+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
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
              <Card className="glass-card overflow-hidden group hover:border-primary/30 transition-all duration-300">
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
                      <div key={profile.id} className="flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-sm group/profile">
                        <div className="flex items-center gap-2">
                          <User className={`h-3 w-3 ${profile.status === 'activo' ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`${profile.status === 'disponible' ? 'text-muted-foreground italic' : 'text-white'}`}>
                            {profile.name}
                          </span>
                        </div>
                        
                        {profile.status === 'activo' ? (
                          <div className="flex gap-2">
                            {profile.endDate && differenceInDays(new Date(profile.endDate), new Date()) <= 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary"
                                onClick={() => renewProfile(account.id, profile.id, profile.price || account.pricePerProfile)}
                              >
                                <RotateCw className="h-3 w-3" />
                              </Button>
                            )}
                            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {profile.phone ? profile.phone.substring(0, 10) : 'Ocupado'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Disponible</span>
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
    </div>
  );
}
