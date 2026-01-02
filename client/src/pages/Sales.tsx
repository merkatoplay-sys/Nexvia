import { useStreaming } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ShoppingCart, MessageSquare, Copy } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { format, addDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type SaleMode = 'perfil' | 'cuenta';

const DEFAULT_SALE_MESSAGE_TPL = `Hola 👋🏻

Aquí están tus datos de acceso:

Servicio: {{serviceName}}
📧 Correo: {{accountEmail}}
🔑 Contraseña: {{accountPassword}}
👤 Perfil: {{profileName}}
🔢 PIN: {{pin}}
📅 Caduca: {{endDate}}

Renovación: Renovar 1 o 2 días antes si gusta continuar con el servicio.

Cualquier inconveniente, no dudes en contactarnos ✅`;

const formatSpanishLongDate = (isoOrDate: string | Date | null | undefined) => {
  if (!isoOrDate) return '';
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return '';
    return format(d, "d 'de' MMMM yyyy", { locale: es }); // Ej: 4 de enero 2026
  } catch {
    return '';
  }
};

const applyTemplate = (tpl: string, vars: Record<string, string>) => {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? '');
};

export default function Sales() {
  const { accounts, services, sellProfile, sellAccount, clients, settings } = useStreaming();
  const [location] = useLocation();

  const accountsSafe = accounts ?? [];
  const servicesSafe = services ?? [];
  const clientsSafe = clients ?? [];

  // --- helpers serviceId ---
  const getServiceById = (id?: string) => (id ? servicesSafe.find((s: any) => s.id === id) ?? null : null);
  const getServiceForAccount = (acc: any) => {
    if (!acc) return null;
    const byId = acc.serviceId ? getServiceById(acc.serviceId) : null;
    if (byId) return byId;
    if (acc.serviceName) return servicesSafe.find((s: any) => s.name === acc.serviceName) ?? null;
    return null;
  };
  const getServiceNameForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return svc?.name ?? acc?.serviceName ?? '';
  };
  const getServiceColorForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return svc?.color ?? '#6366f1';
  };

  // --- states ---
  const [saleMode, setSaleMode] = useState<SaleMode>('perfil');

  // ✅ ahora seleccionamos servicio por ID
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);

  // ✅ Precio como string para permitir vacío (sin 0 molesto)
  const [saleData, setSaleData] = useState({
    name: '',
    phone: '',
    pin: '',
    price: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });

  // ✅ Modal mensaje cliente
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgAccountId, setMsgAccountId] = useState<string>('');
  const [msgProfileId, setMsgProfileId] = useState<string>(''); // vacío = cuenta completa
  const [msgText, setMsgText] = useState<string>('');

  // ✅ Leer query params (serviceId nuevo + compat con serviceName viejo)
  useEffect(() => {
    const url = new URL(window.location.href);
    const mode = (url.searchParams.get('mode') as SaleMode | null) ?? null;

    const serviceIdQP = url.searchParams.get('serviceId') ?? '';
    const serviceNameQP = url.searchParams.get('service') ?? ''; // compat viejo
    const accountId = url.searchParams.get('accountId') ?? '';
    const profileId = url.searchParams.get('profileId') ?? '';

    if (!serviceIdQP && !serviceNameQP && !accountId && !profileId) return;

    if (mode === 'cuenta' || mode === 'perfil') setSaleMode(mode);

    // preferimos serviceId
    if (serviceIdQP) {
      setSelectedServiceId(serviceIdQP);
    } else if (serviceNameQP) {
      // fallback: buscar el primer service que matchee por nombre (si hay duplicados, no es perfecto)
      const found = servicesSafe.find((s: any) => s.name === serviceNameQP);
      if (found?.id) setSelectedServiceId(found.id);
    }

    if (accountId) {
      const exists = accountsSafe.some((a: any) => a.id === accountId);
      if (exists) setSelectedAccountId(accountId);
    }
    if (profileId) setSelectedProfileId(profileId);

    setIsSellDialogOpen(true);
  }, [location, accountsSafe, servicesSafe]);

  const selectedAccount = useMemo(
    () => accountsSafe.find((a: any) => a.id === selectedAccountId),
    [accountsSafe, selectedAccountId]
  );

  const isAccountSold = (acc: any) => {
    if (!acc) return false;
    if (acc.saleType !== 'cuenta') return false;
    if (!acc.soldEndDate) return true;
    const soldEnd = new Date(acc.soldEndDate);
    return isAfter(soldEnd, new Date());
  };

  // ✅ Filtrar cuentas por serviceId (fallback por nombre para cuentas viejas)
  const filteredAccounts = useMemo(() => {
    if (!selectedServiceId) return accountsSafe;

    const svc = getServiceById(selectedServiceId);
    return accountsSafe.filter((a: any) => {
      if (a.serviceId) return a.serviceId === selectedServiceId;
      // fallback viejo (no perfecto si hay nombres duplicados)
      return svc?.name && a.serviceName === svc.name;
    });
  }, [accountsSafe, selectedServiceId, servicesSafe]);

  // perfiles disponibles del account seleccionado (modal)
  const selectedAccountProfiles = (selectedAccount?.profiles ?? []) as any[];
  const availableProfiles = selectedAccountProfiles.filter((p: any) => p.status === 'disponible');

  const canConfirm =
    !!selectedServiceId &&
    !!selectedAccountId &&
    !!saleData.name.trim() &&
    !!saleData.phone.trim() &&
    saleData.price !== '' &&
    Number(saleData.price) > 0 &&
    !!saleData.startDate &&
    !!saleData.endDate &&
    (saleMode === 'cuenta' ? true : !!selectedProfileId);

  const resetForm = () => {
    setIsSellDialogOpen(false);
    setSelectedAccountId('');
    setSelectedProfileId('');
    setSelectedServiceId('');
    setSaleMode('perfil');
    setSaleData({
      name: '',
      phone: '',
      pin: '',
      price: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    });
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;

    const priceNum = Number(saleData.price);

    if (saleMode === 'perfil') {
      const ok = await sellProfile(selectedAccountId, selectedProfileId, {
        name: saleData.name,
        phone: saleData.phone,
        pin: saleData.pin,
        price: priceNum,
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
      price: priceNum,
      startDate: saleData.startDate + 'T00:00:00Z',
      endDate: saleData.endDate + 'T00:00:00Z',
    });

    if (ok) resetForm();
  };

  // ✅ Mensaje (1 toque): tocar un perfil ACTIVO abre modal de mensaje ya con ese perfil elegido
  const openMessageFromProfileTap = (accountId: string, profileId?: string) => {
    setMsgAccountId(accountId);
    setMsgProfileId(profileId ?? '');
    setMsgText('');
    setMsgOpen(true);

    // auto-genera (opcional)
    setTimeout(() => {
      const text = buildMessage(accountId, profileId ?? '');
      setMsgText(text);
      if (!text) toast.error('No se pudo generar el mensaje.');
    }, 0);
  };

  const buildMessage = (accountId: string, profileId: string) => {
    const acc = accountsSafe.find((a: any) => a.id === accountId);
    if (!acc) return '';

    const tpl =
      settings?.saleMessageTemplate && String(settings.saleMessageTemplate).trim()
        ? String(settings.saleMessageTemplate)
        : DEFAULT_SALE_MESSAGE_TPL;

    const prof = profileId ? (acc.profiles ?? []).find((p: any) => p.id === profileId) : null;

    const endDateRaw = prof?.endDate || acc.soldEndDate || acc.expirationDate || '';

    const vars: Record<string, string> = {
      serviceName: String(getServiceNameForAccount(acc) ?? ''),
      accountEmail: String(acc.email ?? ''),
      accountPassword: String((acc as any).password ?? ''),
      profileName: prof ? String(prof.name ?? '') : 'Cuenta completa',
      pin: prof ? String(prof.pin ?? '') : '',
      endDate: formatSpanishLongDate(endDateRaw),
    };

    return applyTemplate(tpl, vars).trim();
  };

  const handleCopy = async () => {
    if (!msgText.trim()) return;
    try {
      await navigator.clipboard.writeText(msgText);
      toast.success('Mensaje copiado ✅');
    } catch {
      toast.error('No pude copiar. Copia manualmente.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-1 sm:mb-2">Ventas</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Vende perfiles disponibles o vende una cuenta completa.
          </p>
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

              {/* ✅ Servicio por ID */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Servicio</label>
                <Select
                  value={selectedServiceId}
                  onValueChange={(v) => {
                    setSelectedServiceId(v);
                    setSelectedAccountId('');
                    setSelectedProfileId('');
                  }}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    {servicesSafe
                      .filter((s: any) => s.name && String(s.name).trim())
                      .map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {!!selectedServiceId && (
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
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Nombre del Cliente</label>
                <Input
                  className="glass-input"
                  placeholder="Juan Pérez"
                  value={saleData.name}
                  onChange={(e) => setSaleData({ ...saleData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Teléfono</label>
                <Input
                  className="glass-input"
                  placeholder="+502 5555 5555"
                  value={saleData.phone}
                  onChange={(e) => setSaleData({ ...saleData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">PIN (opcional)</label>
                <Input
                  className="glass-input"
                  placeholder="1234"
                  value={saleData.pin}
                  onChange={(e) => setSaleData({ ...saleData, pin: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Precio ($)</label>
                <Input
                  type="number"
                  className="glass-input"
                  placeholder="Ej: 25"
                  value={saleData.price}
                  onChange={(e) => setSaleData({ ...saleData, price: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Fecha de Inicio</label>
                  <Input
                    type="date"
                    className="glass-input"
                    value={saleData.startDate}
                    onChange={(e) => setSaleData({ ...saleData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Fecha de Vencimiento</label>
                  <Input
                    type="date"
                    className="glass-input"
                    value={saleData.endDate}
                    onChange={(e) => setSaleData({ ...saleData, endDate: e.target.value })}
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
              <Button onClick={handleConfirm} className="bg-primary text-white" disabled={!canConfirm}>
                Confirmar Venta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ✅ Tip global en página (no ocupa espacio en cards) */}
      <div className="text-[11px] sm:text-xs text-muted-foreground">
        Tip: toca un <span className="text-white">perfil activo</span> para generar el mensaje al cliente. Toca un{' '}
        <span className="text-white">perfil disponible</span> para venderlo.
      </div>

      {/* ✅ Modal Mensaje */}
      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mensaje para el cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                className="bg-primary text-white w-full"
                onClick={() => {
                  const text = buildMessage(msgAccountId, msgProfileId);
                  setMsgText(text);
                  if (!text) toast.error('No se pudo generar el mensaje (revisa cuenta/perfil).');
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Regenerar mensaje
              </Button>
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={handleCopy}
                disabled={!msgText.trim()}
                title="Copiar"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Aquí aparecerá el mensaje..."
              className="min-h-[220px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMsgOpen(false)}
              className="border-white/10 hover:bg-white/5 text-white"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Cards: 2 columnas en teléfono */}
      <div className="grid gap-3 sm:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
        {filteredAccounts.map((account: any) => {
          const realProfiles = (account.profiles ?? []) as any[];
          const totalSlots = Number(account.totalProfiles || 0);

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

          const realAvailable = realProfiles.filter((p: any) => p.status === 'disponible');
          const availableCount = displayProfiles.filter((p: any) => p.status === 'disponible').length;

          const serviceName = getServiceNameForAccount(account);
          const serviceColor = getServiceColorForAccount(account);

          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="glass-card overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-2 sm:pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg text-white truncate">
                        {serviceName}
                      </CardTitle>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {account.email}
                      </p>
                      {sold && (
                        <p className="text-[10px] sm:text-xs text-amber-300 mt-1 truncate">
                          Cuenta vendida {soldClient ? `a ${soldClient.name}` : ''}
                        </p>
                      )}
                    </div>

                    <div className={`text-right text-xs sm:text-sm font-bold ${availableCount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {availableCount}/{totalSlots}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Slots
                    </h4>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                      {displayProfiles.map((p: any) => {
                        const clickable = !sold && (p.status === 'disponible' || p.status === 'activo');

                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-xs sm:text-sm
                              ${clickable ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
                            onClick={() => {
                              if (!clickable) return;

                              // ✅ 1 toque:
                              if (p.status === 'activo') {
                                openMessageFromProfileTap(account.id, p.id);
                                return;
                              }

                              // ✅ vender si es disponible
                              if (p.status === 'disponible') {
                                setSaleMode('perfil');
                                setSelectedServiceId(account.serviceId || selectedServiceId);
                                setSelectedAccountId(account.id);

                                const idToUse = p.__placeholder ? (realAvailable[0]?.id ?? '') : p.id;
                                setSelectedProfileId(idToUse);
                                setIsSellDialogOpen(true);
                              }
                            }}
                            title={sold ? 'Cuenta vendida' : (clickable ? 'Tocar' : '')}
                          >
                            <span className={`truncate ${p.status === 'disponible' ? 'text-muted-foreground italic' : 'text-white'}`}>
                              {p.name}
                            </span>

                            <div className="flex items-center gap-1">
                              {p.status === 'activo' ? (
                                <span className="text-[9px] sm:text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                  {p.name}
                                </span>
                              ) : p.status === 'vencido' ? (
                                <span className="text-[9px] sm:text-[10px] px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/25">
                                  Vencido
                                </span>
                              ) : (
                                <span className="text-[9px] sm:text-[10px] text-muted-foreground">Disp.</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!sold && availableCount > 0 && (
                    <Button
                      className="w-full h-8 sm:h-9 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary text-xs sm:text-sm"
                      onClick={() => {
                        setSaleMode('perfil');
                        setSelectedServiceId(account.serviceId || selectedServiceId);
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
                      className="w-full h-8 sm:h-9 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs sm:text-sm"
                      onClick={() => {
                        setSaleMode('cuenta');
                        setSelectedServiceId(account.serviceId || selectedServiceId);
                        setSelectedAccountId(account.id);
                        setSelectedProfileId('');
                        setIsSellDialogOpen(true);
                      }}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Vender Cuenta
                    </Button>
                  )}

                  {sold && (
                    <div className="w-full text-center text-[10px] sm:text-xs text-muted-foreground">
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
