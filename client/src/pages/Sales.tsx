import { useStreaming } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, ShoppingCart } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { format, addDays, isAfter } from 'date-fns';
import { motion } from 'framer-motion';

type SaleMode = 'perfil' | 'cuenta';

export default function Sales() {
  const { accounts, sellProfile, sellAccount, clients } = useStreaming();
  const [location] = useLocation();

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

  // ✅ Leer query params para abrir modal desde Accounts (opcional)
  useEffect(() => {
    const url = new URL(window.location.href);
    const mode = (url.searchParams.get('mode') as SaleMode | null) ?? null;
    const service = url.searchParams.get('service') ?? '';
    const accountId = url.searchParams.get('accountId') ?? '';
    const profileId = url.searchParams.get('profileId') ?? '';

    if (!service && !accountId && !profileId) return;

    if (mode === 'cuenta' || mode === 'perfil') setSaleMode(mode);
    if (service) setSelectedService(service);

    if (accountId) {
      const exists = accountsSafe.some(a => a.id === accountId);
      if (exists) setSelectedAccountId(accountId);
    }

    if (profileId) setSelectedProfileId(profileId);

    setIsSellDialogOpen(true);
  }, [location, accountsSafe]);

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
    if (!acc.soldEndDate) return true;
    const soldEnd = new Date(acc.soldEndDate);
    return isAfter(soldEnd, new Date());
  };

  // Solo perfiles reales del account seleccionado (modal)
  const selectedAccountProfiles = (selectedAccount?.profiles ?? []) as any[];
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

  const resetForm = () => {
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
  };

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

      if (ok) resetForm();
      return;
    }

    const ok = await sellAccount(selectedAccountId, {
      name: saleData.name,
      phone: saleData.phone,
      pin: saleData.pin || undefined,
      price: Number(saleData.price),
      startDate: saleData.startDate + 'T00:00:00Z',
      endDate: saleData.endDate + 'T00:00:00Z',
    });

    if (ok) resetForm();
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

          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Venta</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Tipo de Venta</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className={
                      saleMode === 'perfil'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }
                    onClick={() => {
                      setSaleMode('perfil');
                      setSelectedProfileId('');
                    }}
                  >
                    Perfil
                  </Button>
                  <Button
                    type="button"
                    className={
                      saleMode === 'cuenta'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }
                    onClick={() => {
                      setSaleMode('cuenta');
                      setSelectedProfileId('');
                    }}
                  >
                    Cuenta completa
                  </Button>
                </div>
              </div>

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
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!!selectedService && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Cuenta Maestra</label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={(v) => {
                      setSelectedAccountId(v);
                      setSelectedProfileId('');
                    }}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Selecciona una cuenta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {filteredAccounts.map((acc: any) => {
                        const sold = isAccountSold(acc);
                        const profiles = (acc.profiles ?? []) as any[];
                        const avail = profiles.filter((p: any) => p.status === 'disponible').length;

                        const disableForProfile = saleMode === 'perfil' && (sold || avail === 0);
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

              {saleMode === 'perfil' && !!selectedAccountId && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Perfil Disponible</label>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Selecciona un perfil" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {availableProfiles.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Tip: También puedes darle click a un slot en la lista de abajo para abrir este modal.
                  </p>
                </div>
              )}

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
                  onChange={e => setSaleData({ ...saleData, price: parseFloat(e.target.value || '0') })}
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

      {/* ✅ Cards con slots SIEMPRE visibles */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAccounts.map((account: any) => {
          const realProfiles = (account.profiles ?? []) as any[];
          const totalSlots = Number(account.totalProfiles || 0);

          // ✅ placeholders para mostrar SIEMPRE el total de slots
          const displayProfiles = Array.from({ length: totalSlots }, (_, idx) => {
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

          const sold = isAccountSold(account);
          const soldClient = sold ? clientsSafe.find((c: any) => c.id === account.soldClientId) : null;

          // para escoger un perfil real disponible si existe
          const realAvailable = realProfiles.filter((p: any) => p.status === 'disponible');
          const availableCount = displayProfiles.filter((p: any) => p.status === 'disponible').length;

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
                      {availableCount}/{totalSlots}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Slots</h4>

                    {displayProfiles.map((p: any) => {
                      const clickable = !sold; // si está vendida, no abrir modal

                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-sm
                            ${clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                          onClick={() => {
                            if (!clickable) return;

                            // Abrir modal de venta perfil por click en slot
                            setSaleMode('perfil');
                            setSelectedService(account.serviceName);
                            setSelectedAccountId(account.id);

                            // si es un perfil real disponible -> setear id
                            // si es placeholder -> si existe algún real disponible, usa el primero
                            if (p.status === 'disponible') {
                              const idToUse = p.__placeholder ? (realAvailable[0]?.id ?? '') : p.id;
                              setSelectedProfileId(idToUse);
                            } else {
                              setSelectedProfileId('');
                            }

                            setIsSellDialogOpen(true);
                          }}
                          title={sold ? 'Cuenta vendida' : 'Click para vender'}
                        >
                          <span className={`truncate ${p.status === 'disponible' ? 'text-muted-foreground italic' : 'text-white'}`}>
                            {p.name}
                          </span>

                          {p.status === 'activo' ? (
                            <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                              Activo
                            </span>
                          ) : p.status === 'vencido' ? (
                            <span className="text-[10px] px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/25">
                              Vencido
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Disponible</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Botones opcionales */}
                  {!sold && availableCount > 0 && (
                    <Button
                      className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary"
                      onClick={() => {
                        setSaleMode('perfil');
                        setSelectedService(account.serviceName);
                        setSelectedAccountId(account.id);
                        setSelectedProfileId(realAvailable[0]?.id ?? '');
                        setIsSellDialogOpen(true);
                      }}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Vender Perfil
                    </Button>
                  )}

                  {!sold && (
                    <Button
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white"
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
                    <div className="w-full text-center text-xs text-muted-foreground">
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
