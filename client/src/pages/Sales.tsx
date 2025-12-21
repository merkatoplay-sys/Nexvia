import { useStreaming, ServiceType } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, ShoppingCart, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function Sales() {
  const { accounts, clients, sellProfile } = useStreaming();
  const [selectedService, setSelectedService] = useState<string>('');
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  
  const [saleData, setSaleData] = useState({
    name: '',
    phone: '',
    pin: '',
    price: 0,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
  });

  const filteredAccounts = selectedService 
    ? accounts.filter(acc => acc.serviceName === selectedService)
    : accounts;

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
  const availableProfiles = selectedAccount?.profiles.filter(p => p.status === 'disponible') || [];

  const handleSellProfile = () => {
    if (!selectedAccountId || !selectedProfileId || !saleData.name || !saleData.phone || !saleData.price || !saleData.endDate || !saleData.startDate) {
      return;
    }

    const success = sellProfile(selectedAccountId, selectedProfileId, {
      name: saleData.name,
      phone: saleData.phone,
      pin: saleData.pin,
      price: Number(saleData.price),
      startDate: saleData.startDate + 'T00:00:00Z',
      endDate: saleData.endDate + 'T00:00:00Z'
    });

    if (success) {
      setIsSellDialogOpen(false);
      setSaleData({ name: '', phone: '', pin: '', price: 0, startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd') });
      setSelectedAccountId('');
      setSelectedProfileId('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Venta de Perfiles</h1>
          <p className="text-muted-foreground">Vende perfiles disponibles a tus clientes.</p>
        </div>
        
        <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]">
              <Plus className="mr-2 h-4 w-4" /> Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Vender Perfil</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Seleccionar Servicio */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Servicio</label>
                <Select onValueChange={setSelectedService} value={selectedService}>
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    {Array.from(new Set(accounts.map(a => a.serviceName))).map(service => (
                      <SelectItem key={service} value={service}>{service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seleccionar Cuenta */}
              {selectedService && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Cuenta Maestra</label>
                  <Select onValueChange={setSelectedAccountId} value={selectedAccountId}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Selecciona una cuenta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {filteredAccounts.map(acc => {
                        const availCount = acc.profiles.filter(p => p.status === 'disponible').length;
                        return (
                          <SelectItem key={acc.id} value={acc.id} disabled={availCount === 0}>
                            {acc.email} ({availCount} disponibles)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Seleccionar Perfil */}
              {selectedAccountId && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Perfil Disponible</label>
                  <Select onValueChange={setSelectedProfileId} value={selectedProfileId}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Selecciona un perfil" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {availableProfiles.map(prof => (
                        <SelectItem key={prof.id} value={prof.id}>{prof.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Datos del Cliente */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Nombre del Cliente</label>
                <Input 
                  className="glass-input" 
                  placeholder="Juan Pérez"
                  value={saleData.name} 
                  onChange={e => setSaleData({...saleData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Teléfono del Cliente</label>
                <Input 
                  className="glass-input" 
                  placeholder="+52 555 123 4567"
                  value={saleData.phone} 
                  onChange={e => setSaleData({...saleData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">PIN (opcional)</label>
                <Input 
                  className="glass-input" 
                  placeholder="1234"
                  value={saleData.pin} 
                  onChange={e => setSaleData({...saleData, pin: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Precio ($)</label>
                <Input 
                  type="number" 
                  className="glass-input" 
                  value={saleData.price} 
                  onChange={e => setSaleData({...saleData, price: parseFloat(e.target.value)})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Fecha de Inicio</label>
                  <Input 
                    type="date" 
                    className="glass-input" 
                    value={saleData.startDate} 
                    onChange={e => setSaleData({...saleData, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Fecha de Vencimiento</label>
                  <Input 
                    type="date" 
                    className="glass-input" 
                    value={saleData.endDate} 
                    onChange={e => setSaleData({...saleData, endDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSellDialogOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
              <Button onClick={handleSellProfile} className="bg-primary text-white" disabled={!selectedAccountId || !selectedProfileId || !saleData.name || !saleData.phone || !saleData.price || !saleData.endDate || !saleData.startDate}>
                Confirmar Venta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro por Servicio */}
      <div className="flex gap-4 items-center bg-card/40 p-4 rounded-lg border border-white/5 backdrop-blur-sm flex-wrap">
        <Button 
          variant={selectedService === '' ? 'default' : 'outline'}
          className={selectedService === '' ? 'bg-primary text-white' : 'border-white/10 hover:bg-white/5 text-white'}
          onClick={() => setSelectedService('')}
        >
          Todos
        </Button>
        {Array.from(new Set(accounts.map(a => a.serviceName))).map(service => (
          <Button 
            key={service}
            variant={selectedService === service ? 'default' : 'outline'}
            className={selectedService === service ? 'bg-secondary text-black' : 'border-white/10 hover:bg-white/5 text-white'}
            onClick={() => setSelectedService(service)}
          >
            {service}
          </Button>
        ))}
      </div>

      {/* Grid de Cuentas con Perfiles Disponibles */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAccounts.map((account) => {
          const activeProfiles = account.profiles.filter(p => p.status === 'activo').length;
          const availableCount = account.profiles.filter(p => p.status === 'disponible').length;

          return (
            <motion.div 
              key={account.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="glass-card overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <CardTitle className="text-lg text-white">{account.serviceName}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                    </div>
                    <div className={`text-right text-sm font-bold ${availableCount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {availableCount}/{account.totalProfiles}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className="bg-background/40 p-2 rounded border border-white/5 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Vendidos</span>
                      <span className="text-lg font-bold text-emerald-400">{activeProfiles}</span>
                    </div>
                    <div className="bg-background/40 p-2 rounded border border-white/5 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Disponibles</span>
                      <span className="text-lg font-bold text-blue-400">{availableCount}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perfiles</h4>
                    {account.profiles.map((profile) => (
                      <div key={profile.id} className={`flex items-center justify-between p-2 rounded-md text-sm border
                        ${profile.status === 'activo' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                        <div>
                          <p className={profile.status === 'activo' ? 'text-emerald-400 font-medium' : 'text-white'}>
                            {profile.name}
                          </p>
                          {profile.status === 'activo' && (
                            <p className="text-xs text-muted-foreground">{profile.phone}</p>
                          )}
                        </div>
                        {profile.status === 'activo' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Disponible</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {availableCount > 0 && (
                    <Button 
                      className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary"
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        setIsSellDialogOpen(true);
                      }}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Vender Perfil
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
