import { useStreaming } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ShoppingCart, MessageSquare, Copy } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { format, addDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type SaleMode = 'perfil' | 'cuenta';

type MsgTarget =
  | { kind: 'profile'; accountId: string; profileId: string }
  | { kind: 'account'; accountId: string };

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
    // Ej: "4 de enero 2026"
    return format(d, "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return '';
  }
};

const applyTemplate = (tpl: string, vars: Record<string, string>) => {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? '');
};

export default function Sales() {
  const { accounts, sellProfile, sellAccount, clients, settings } = useStreaming();
  const [location] = useLocation();

  const accountsSafe = accounts ?? [];
  const clientsSafe = clients ?? [];

  const [saleMode, setSaleMode] = useState<SaleMode>('perfil');
  const [selectedService, setSelectedService] = useState<string>('');
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // ✅ Precio como string para permitir vacío (sin "0")
  const [saleData, setSaleData] = useState({
    name: '',
    phone: '',
    pin: '',
    price: '', // <-- string
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });

  // ✅ Modal mensaje cliente
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgAccountId, setMsgAccountId] = useState<string>('');
  const [msgProfileId, setMsgProfileId] = useState<string>(''); // si vacío => "Cuenta completa"
  const [msgText, setMsgText] = useState<string>('');

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
      const exists = accountsSafe.some((a) => a.id === accountId);
      if (exists) setSelectedAccountId(accountId);
    }

    if (profileId) setSelectedProfileId(profileId);

    setIsSellDialogOpen(true);
  }, [location, accountsSafe]);

  const uniqueServices = useMemo(() => {
    return Array.from(
      new Set(accountsSafe.map((a) => a.serviceName).filter((s) => s && String(s).trim()))
    );
  }, [accountsSafe]);

  const filteredAccounts = useMemo(() => {
    return selectedService ? accountsSafe.filter((a) => a.serviceName === selectedService) : accountsSafe;
  }, [accountsSafe, selectedService]);

  const selectedAccount = useMemo(() => {
    return accountsSafe.find((a) => a.id === selectedAccountId);
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
    setSelectedService('');
    setSaleMode('perfil');
    setSaleData({
      name: '',
      phone: '',
      pin: '',
      price: '', // ✅ limpio
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

  const openMessageDialog = (target: MsgTarget) => {
    setMsgText('');
    setMsgOpen(true);

    if (target.kind === 'account') {
      setMsgAccountId(target.accountId);
      setMsgProfileId('');
      return;
    }

    setMsgAccountId(target.accountId);
    setMsgProfileId(target.profileId);
  };

  const buildMessage = () => {
    const acc = accountsSafe.find((a) => a.id === msgAccountId);
    if (!acc) return '';

    const tpl =
      settings?.saleMessageTemplate && String(settings.saleMessageTemplate).trim()
        ? String(settings.saleMessageTemplate)
        : DEFAULT_SALE_MESSAGE_TPL;

    const prof = msgProfileId
      ? (acc.profiles ?? []).find((p: any) => p.id === msgProfileId)
      : null;

    const endDateRaw = prof?.endDate || acc.soldEndDate || acc.expirationDate || '';

    const vars: Record<string, string> = {
      serviceName: String(acc.serviceName ?? ''),
      accountEmail: String(acc.email ?? ''),
      accountPassword: String((acc as any).password ?? ''),
      profileName: prof ? String(prof.name ?? '') : 'Cuenta completa',
      pin: prof ? String(prof.pin ?? '') : '',
      endDate: formatSpanishLongDate(endDateRaw),
    };

    return applyTemplate(tpl, vars).trim();
  };

  const handleGenerateMessage = () => {
    const text = buildMessage();
    setMsgText(text);
    if (!text) toast.error('No se pudo generar el mensaje (revisa cuenta/perfil).');
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

  const msgAccount = useMemo(
    () => accountsSafe.find((a) => a.id === msgAccountId),
    [accountsSafe, msgAccountId]
  );

  const msgActiveProfiles = useMemo(() => {
    const list = (msgAccount?.profiles ?? []).filter((p: any) => p.status === 'activo');
    return list;
  }, [msgAccount]);

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
                    {uniqueServices.map((service) => (
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
                    Tip: También puedes darle click a un slot disponible para abrir este modal.
                  </p>
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

      {/* ✅ Modal Mensaje Cliente (SIEMPRE disponible) */}
      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mensaje para el cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Selecciona perfil (activo)</label>
              <Select
                value={msgProfileId || '__account__'}
                onValueChange={(v) => setMsgProfileId(v === '__account__' ? '' : v)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Selecciona un perfil" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10 text-white">
                  <SelectItem value="__account__">Cuenta completa</SelectItem>
                  {msgActiveProfiles.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Genera el mensaje y luego lo copias.</p>
            </div>

            <div className="flex gap-2">
              <Button className="bg-primary text-white w-full" onClick={handleGenerateMessage}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Generar mensaje
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

      {/* ✅ Cards: 2 columnas en TELÉFONO para reducir scroll */}
      <div className="grid gap-3 sm:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
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
                <CardHeader className="bg-white/5 border-b border-white/5 pb-2 sm:pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg text-white truncate">{account.serviceName}</CardTitle>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{account.email}</p>
                      {sold && (
                        <p className="text-[10px] sm:text-xs text-amber-300 mt-1 truncate">
                          Cuenta vendida {soldClient ? `a ${soldClient.name}` : ''}
                        </p>
                      )}
                    </div>

                    <div
                      className={`text-right text-xs sm:text-sm font-bold ${
                        availableCount > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {availableCount}/{totalSlots}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                  {/* ✅ Botón SIEMPRE visible para generar mensaje (elige perfil en modal) */}
                  <Button
                    variant="outline"
                    className="w-full h-8 sm:h-9 border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs sm:text-sm"
                    onClick={() => openMessageDialog({ kind: 'account', accountId: account.id })}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Mensaje cliente
                  </Button>

                  <div className="space-y-2">
                    <h4 className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Slots
                    </h4>

                    {/* ✅ Slots en 2 columnas SOLO en móvil */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                      {displayProfiles.map((p: any) => {
                        // ✅ solo abrir modal de VENTA cuando está disponible
                        const clickable = !sold && p.status === 'disponible';

                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-xs sm:text-sm
                              ${clickable ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
                            onClick={() => {
                              if (!clickable) return;

                              setSaleMode('perfil');
                              setSelectedService(account.serviceName);
                              setSelectedAccountId(account.id);

                              const idToUse = p.__placeholder ? realAvailable[0]?.id ?? '' : p.id;
                              setSelectedProfileId(idToUse);

                              setIsSellDialogOpen(true);
                            }}
                            title={sold ? 'Cuenta vendida' : clickable ? 'Click para vender' : ''}
                          >
                            <span
                              className={`truncate ${
                                p.status === 'disponible' ? 'text-muted-foreground italic' : 'text-white'
                              }`}
                            >
                              {p.name}
                            </span>

                            <div className="flex items-center gap-1">
                              {p.status === 'activo' ? (
                                <>
                                  {/* ✅ EN MÓVIL: mostrar nombre en verde en vez de "Activo" */}
                                  <span className="text-[9px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 truncate max-w-[90px] sm:hidden">
                                    {String(p.name || 'Activo')}
                                  </span>

                                  {/* ✅ EN DESKTOP: etiqueta "Activo" */}
                                  <span className="hidden sm:inline text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                    Activo
                                  </span>

                                  {/* ✅ Botón por perfil activo para mensaje inmediato */}
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-6 w-6 border-white/10 bg-white/5 text-white hover:bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMessageDialog({ kind: 'profile', accountId: account.id, profileId: p.id });
                                    }}
                                    title="Mensaje (copiar)"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </Button>
                                </>
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

                  {/* Botones de venta */}
                  {!sold && availableCount > 0 && (
                    <Button
                      className="w-full h-8 sm:h-9 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary text-xs sm:text-sm"
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
                      className="w-full h-8 sm:h-9 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs sm:text-sm"
                      onClick={() => {
                        setSaleMode('cuenta');
                        setSelectedService(account.serviceName);
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
