import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, ShoppingCart, CheckCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format, addDays, isAfter } from 'date-fns';
import { motion } from 'framer-motion';

type SaleMode = 'perfil' | 'cuenta';

export default function Sales() {
  const { accounts, sellProfile, sellAccount, clients } = useStreaming();

  const accountsSafe = accounts ?? [];
  const clientsSafe = clients ?? [];

  const [saleMode, setSaleMode] = useState<SaleMode>('perfil');
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
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });

  const uniqueServices = useMemo(() => {
    return Array.from(new Set(accountsSafe.map(a => a.serviceName).filter(s => s && String(s).trim())));
  }, [accountsSafe]);

  const filteredAccounts = useMemo(() => {
    return selectedService ? accountsSafe.filter(a => a.serviceName === selectedService) : accountsSafe;
  }, [accountsSafe, selectedService]);

  const selectedAccount = useMemo(() => {
    return accountsSafe.find(a => a.id === selectedAccountId);
  }, [accountsSafe, selectedAccountId]);

  const isAccountSold = (acc: any) => {
    if (!acc) return false;
    if (acc.saleType !== 'cuenta') return false;
    if (!acc.soldEndDate) return true; // por seguridad
    const soldEnd = new Date(acc.soldEndDate);
    // vendida mientras no haya vencido
    return isAfter(soldEnd, new Date());
  };

  const selectedAccountProfiles = (selectedAccount?.profiles ?? []);
  const availableProfiles = selectedAccountProfiles.filter((p: any) => p.status === 'disponible');

  const canConfirm =
    !!selectedService &&
    !!selectedAccountId &&
    !!saleData.name &&
    !!saleData.phone &&
    !!saleData.price &&
    !!saleData.startDate &&
    !!saleData.endDate &&
    (saleMode === 'cuenta' ? true : !!selectedProfileId);

  const handleConfirm = async () => {
    if (!canConfirm) return;

    if (saleMode === 'perfil') {
      const ok = await sellProfile(selectedAccountId, selectedProfileId, {
        name: saleData.name,
        phone: saleData.phone,
        pin: saleData.pin,
        price: Number(saleData.price),
        startDate: saleData.startDate + 'T00:00:00Z',
        endDate: saleData.endDate + 'T00:00:00Z',
      });

      if (ok) {
        setIsSellDialogOpen(false);
        setSelectedAccountId('');
        setSelectedProfileId('');
        setSelectedService('');
        setSaleData({
          name: '',
          phone: '',
          pin: '',
          price: 0,
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        });
      }
      return;
    }

    // ✅ venta cuenta completa
    const ok = await sellAccount(selectedAccountId, {
      name: saleData.name,
      phone: saleData.phone,
      pin: saleData.pin || undefined,
      price: Number(saleData.price),
      startDate: saleData.startDate + 'T00:00:00Z',
      endDate: saleData.endDate + 'T00:00:00Z',
    });

    if (ok) {
      setIsSellDialogOpen(false);
      setSelectedAccountId('');
      setSelectedProfileId('');
      setSelectedService('');
      setSaleMode('perfil');
      setSaleData({
        name: '',
        phone: '',
        pin: '',
        price: 0,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Ventas</h1>
          <p className="text-muted-foreground">Vende perfiles disponibles o vende una cuenta completa.</p>
        </div>

        <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]">
              <Plus className="mr-2 h-4 w-4" /> Nueva Venta
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva Venta</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Tipo de venta */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Tipo de Venta</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className={saleMode === 'perfil'
                      ? 'bg-primary text-white'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}
                    onClick={() => setSaleMode('perfil')}
                  >
                    Perfil
                  </Button>
                  <Button
                    type="button"
                    className={saleMode === 'cuenta'
                      ? 'bg-primary text-white'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}
                    onClick={() => setSaleMode('cuenta')}
                  >
                    Cuenta completa
                  </Button>
                </div>
              </div>

              {/* Servicio */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Servicio</label>
                <Select
                  value={selectedService}
                  onValueChange={(v) => {
                    setSelectedService(v);
                    setSelectedAccountId('');
                    setSelectedProfileId('');
                  }}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    {uniqueServices.map(service => (
                      <SelectItem key={service} value={service}>{service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cuenta */}
              {!!selectedService && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Cuenta Maestra</label>
                  <Select value={selectedAccountId} onValueChange={(v) => { setSelectedAccountId(v); setSelectedProfileId(''); }}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Selecciona una cuenta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {filteredAccounts.map((acc: any) => {
                        const sold = isAccountSold(acc);
                        const profiles = (acc.profiles ?? []);
                        const avail = profiles.filter((p: any) => p.status === 'disponible').length;

                        // si vendes PERFIL, necesitas al menos 1 disponible
                        const disableForProfile = saleMode === 'perfil' && (sold || avail === 0);

                        // si vendes CUENTA, no puedes venderla si ya está vendida
                        const disableForAccount = saleMode === 'cuenta' && sold;

                        const disabled = disableForProfile || disableForAccount;

                        return (
                          <SelectItem key={acc.id} value={acc.id} disabled={disabled}>
                            {acc.email} {sold ? '(Cuenta vendida)' : `(${avail} disponibles)`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Perfil (solo si es venta por perfil) */}
              {saleMode === 'perfil' && !!selectedAccountId && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Perfil Disponible</label>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Selecciona un perfil" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {availableProfiles.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Cliente */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Nombre del Cliente</label>
                <Input
                  className="glass-input"
                  placeholder="Juan Pérez"
                  value={saleData.name}
                  onChange={e => setSaleData({ ...saleData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Teléfono</label>
                <Input
                  className="glass-input"
                  placeholder="+502 5555 5555"
                  value={saleData.phone}
                  onChange={e => setSaleData({ ...saleData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">PIN (opcional)</label>
                <Input
                  className="glass-input"
                  placeholder="1234"
                  value={saleData.pin}
                  onChange={e => setSaleData({ ...saleData, pin: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Precio ($)</label>
                <Input
                  type="number"
                  className="glass-input"
                  value={saleData.price}
                  onChange={e => setSaleData({ ...saleData, price: parseFloat(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Fecha de Inicio</label>
                  <Input
                    type="date"
                    className="glass-input"
                    value={saleData.startDate}
                    onChange={e => setSaleData({ ...saleData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Fecha de Vencimiento</label>
                  <Input
                    type="date"
                    className="glass-input"
                    value={saleData.endDate}
                    onChange={e => setSaleData({ ...saleData, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSellDialogOpen(false)}
                className="border-white/10 hover:bg-white/5 text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                className="bg-primary text-white"
                disabled={!canConfirm}
              >
                Confirmar Venta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid resumen */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAccounts.map((account: any) => {
          const profiles = (account.profiles ?? []);
          const activeProfiles = profiles.filter((p: any) => p.status === 'activo').length;
          const availableCount = profiles.filter((p: any) => p.status === 'disponible').length;

          const sold = isAccountSold(account);
          const soldClient = sold ? clientsSafe.find((c: any) => c.id === account.soldClientId) : null;

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
                      {sold && (
                        <p className="text-xs text-amber-300 mt-1">
                          Cuenta vendida {soldClient ? `a ${soldClient.name}` : ''}
                        </p>
                      )}
                    </div>
                    <div className={`text-right text-sm font-bold ${availableCount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {availableCount}/{account.totalProfiles}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className="bg-background/40 p-2 rounded border border-white/5 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Activos</span>
                      <span className="text-lg font-bold text-emerald-400">{activeProfiles}</span>
                    </div>
                    <div className="bg-background/40 p-2 rounded border border-white/5 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Disponibles</span>
                      <span className="text-lg font-bold text-blue-400">{availableCount}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perfiles</h4>
                    {profiles.map((profile: any) => (
                      <div
                        key={profile.id}
                        className={`flex items-center justify-between p-2 rounded-md text-sm border
                          ${profile.status === 'activo' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}
                      >
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

                  {/* Si cuenta vendida, no permitir vender perfil */}
                  {!sold && availableCount > 0 && (
                    <Button
                      className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary"
                      onClick={() => {
                        setSaleMode('perfil');
                        setSelectedService(account.serviceName);
                        setSelectedAccountId(account.id);
                        setSelectedProfileId('');
                        setIsSellDialogOpen(true);
                      }}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Vender Perfil
                    </Button>
                  )}

                  {/* Botón vender cuenta completa */}
                  {!sold && (
                    <Button
                      className="w-full mt-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                      onClick={() => {
                        setSaleMode('cuenta');
                        setSelectedService(account.serviceName);
                        setSelectedAccountId(account.id);
                        setSelectedProfileId('');
                        setIsSellDialogOpen(true);
                      }}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Vender Cuenta Completa
                    </Button>
                  )}

                  {sold && (
                    <div className="w-full mt-2 text-center text-xs text-muted-foreground">
                      Esta cuenta está vendida, perfiles bloqueados.
                    </div>
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
