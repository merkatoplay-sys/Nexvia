import { useStreaming } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ShoppingCart, Copy, ExternalLink, DollarSign, Ban } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { format, addDays, isAfter } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type SaleMode = 'perfil' | 'cuenta';

type Tx = {
  id: string;
  description: string;
  amount: number;
  type: 'ganancia' | 'gasto' | 'ajuste';
  date: string;
  reference?: string | null;
  note?: string | null;
  isVoided?: boolean;
  voidedAt?: string | null;
  voidReason?: string | null;
};

const money = (v: any) => `$${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function sanitizePhone(phone: string) {
  return (phone || '').replace(/[^\d]/g, '');
}

function applyTemplate(template: string, vars: Record<string, any>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v === undefined || v === null ? '' : String(v));
  }
  return out;
}

function TxCard({
  exp,
  tone,
  sign,
  onVoid,
}: {
  exp: Tx;
  tone: 'emerald' | 'red' | 'amber';
  sign: '+' | '-' | '';
  onVoid: (exp: Tx) => void;
}) {
  const isVoided = !!exp.isVoided;

  const bg =
    tone === 'emerald'
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : tone === 'red'
      ? 'bg-red-500/10 border-red-500/20'
      : 'bg-amber-500/10 border-amber-500/20';

  const amountColor = tone === 'emerald' ? 'text-emerald-400' : tone === 'red' ? 'text-red-400' : 'text-amber-400';

  return (
    <div className={['p-3 rounded-lg border', bg, isVoided ? 'opacity-60' : ''].join(' ')}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{exp.description}</p>
            {isVoided && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/80">
                ANULADO
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{format(new Date(exp.date), 'dd MMM yyyy HH:mm')}</p>

          {exp.reference && <p className="text-xs text-muted-foreground">Ref: {exp.reference}</p>}

          {isVoided && (
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {exp.voidedAt && (
                <p>
                  <span className="text-white/80">Anulado:</span> {format(new Date(exp.voidedAt), 'dd MMM yyyy HH:mm')}
                </p>
              )}
              {exp.voidReason && (
                <p>
                  <span className="text-white/80">Motivo:</span> {exp.voidReason}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className={`text-sm font-bold ${amountColor}`}>
            {sign} {money(exp.amount)}
          </p>

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => onVoid(exp)}
            disabled={isVoided}
            title={isVoided ? 'Este movimiento ya está anulado' : 'Anular movimiento'}
          >
            <Ban className="h-3.5 w-3.5 mr-1" /> Anular
          </Button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_SALE_TEMPLATE = `Hola 👋🏻

Aquí están tus datos de acceso:

Servicio: {{serviceName}}
📧 Correo: {{accountEmail}}
🔑 Contraseña: {{accountPassword}}
👤 Perfil: {{profileName}}
🔢 PIN: {{pin}}
📅 Caduca: {{endDate}}

Renovación: Renovar 1 o 2 días antes si gusta continuar con el servicio.

Cualquier inconveniente, no dudes en contactarnos ✅`;

export default function Sales() {
  const { accounts, sellProfile, sellAccount, clients, settings, expenses, voidExpense } = useStreaming();
  const [location] = useLocation();

  const accountsSafe = accounts ?? [];
  const clientsSafe = clients ?? [];
  const expensesSafe = (expenses ?? []) as Tx[];

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

  // Mensaje post-venta
  const [messageOpen, setMessageOpen] = useState(false);
  const [finalMessage, setFinalMessage] = useState('');
  const [finalPhone, setFinalPhone] = useState('');

  // Anular movimiento
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Tx | null>(null);
  const [voidReason, setVoidReason] = useState('');

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
      const acc = accountsSafe.find((a: any) => a.id === accountId);
      if (acc) {
        setSelectedAccountId(accountId);
        // ✅ si no viene service en la URL, lo inferimos
        if (!service) setSelectedService(acc.serviceName);
      }
    }

    if (profileId) setSelectedProfileId(profileId);

    setIsSellDialogOpen(true);
  }, [location, accountsSafe]);

  const uniqueServices = useMemo(() => {
    return Array.from(new Set(accountsSafe.map((a: any) => a.serviceName).filter((s: any) => s && String(s).trim())));
  }, [accountsSafe]);

  const filteredAccounts = useMemo(() => {
    return selectedService ? accountsSafe.filter((a: any) => a.serviceName === selectedService) : accountsSafe;
  }, [accountsSafe, selectedService]);

  const selectedAccount = useMemo(() => {
    return accountsSafe.find((a: any) => a.id === selectedAccountId);
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

  const buildMessageAndOpen = (payload: Record<string, any>) => {
    const tpl = (settings?.saleMessageTemplate || '').trim() || DEFAULT_SALE_TEMPLATE;
    const msg = applyTemplate(tpl, payload);
    setFinalMessage(msg);
    setFinalPhone(payload.phone || '');
    setMessageOpen(true);
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;

    const acc: any = accountsSafe.find((a: any) => a.id === selectedAccountId);
    const accountEmail = acc?.email || '';
    const accountPassword = acc?.password || '';
    const serviceName = acc?.serviceName || selectedService;

    if (!acc) {
      toast.error('Cuenta no encontrada');
      return;
    }

    if (saleMode === 'perfil') {
      // slot index (para variables si quieres)
      const slotIndex = (acc.profiles ?? []).findIndex((p: any) => p.id === selectedProfileId);
      const profileSlot = slotIndex >= 0 ? String(slotIndex + 1) : '';

      const ok = await sellProfile(selectedAccountId, selectedProfileId, {
        name: saleData.name.trim(),
        phone: saleData.phone.trim(),
        pin: saleData.pin.trim() ? saleData.pin.trim() : undefined,
        price: Number(saleData.price),
        startDate: saleData.startDate + 'T00:00:00Z',
        endDate: saleData.endDate + 'T00:00:00Z',
      });

      if (ok) {
        resetForm();

        buildMessageAndOpen({
          serviceName,
          accountEmail,
          accountPassword,
          profileName: saleData.name.trim(),
          profileSlot,
          pin: saleData.pin.trim(),
          endDate: saleData.endDate,
          phone: saleData.phone.trim(),
        });
      }
      return;
    }

    const ok = await sellAccount(selectedAccountId, {
      name: saleData.name.trim(),
      phone: saleData.phone.trim(),
      pin: saleData.pin.trim() ? saleData.pin.trim() : undefined,
      price: Number(saleData.price),
      startDate: saleData.startDate + 'T00:00:00Z',
      endDate: saleData.endDate + 'T00:00:00Z',
    });

    if (ok) {
      resetForm();

      buildMessageAndOpen({
        serviceName,
        accountEmail,
        accountPassword,
        profileName: 'Cuenta completa',
        profileSlot: '',
        pin: saleData.pin.trim(),
        endDate: saleData.endDate,
        phone: saleData.phone.trim(),
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalMessage);
      toast.success('Mensaje copiado');
    } catch {
      toast.error('No se pudo copiar. Copia manualmente.');
    }
  };

  const handleOpenWhatsApp = () => {
    const phone = sanitizePhone(finalPhone);
    if (!phone) {
      toast.error('No hay teléfono válido');
      return;
    }
    const text = encodeURIComponent(finalMessage);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const recentTx = useMemo(() => {
    return [...expensesSafe].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 25);
  }, [expensesSafe]);

  const openVoid = (tx: Tx) => {
    setVoidTarget(tx);
    setVoidReason('');
    setVoidOpen(true);
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    const ok = await voidExpense(voidTarget.id, voidReason.trim() || undefined);
    if (ok) {
      setVoidOpen(false);
      setVoidTarget(null);
      setVoidReason('');
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

          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Venta</DialogTitle>
              <DialogDescription className="text-white/70">
                Completa los datos y al confirmar te muestro el mensaje listo para copiar/WhatsApp.
              </DialogDescription>
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
                    {uniqueServices.map((service: any) => (
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
                  value={saleData.price}
                  onChange={(e) => setSaleData({ ...saleData, price: parseFloat(e.target.value || '0') })}
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
                onClick={() => {
                  setIsSellDialogOpen(false);
                }}
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

      {/* ✅ Cards con slots SIEMPRE visibles */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                      const clickable = !sold;

                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-sm
                            ${clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                          onClick={() => {
                            if (!clickable) return;

                            setSaleMode('perfil');
                            setSelectedService(account.serviceName);
                            setSelectedAccountId(account.id);

                            if (p.status === 'disponible') {
                              const idToUse = p.__placeholder ? realAvailable[0]?.id ?? '' : p.id;
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

                  {sold && <div className="w-full text-center text-xs text-muted-foreground">Esta cuenta está vendida, perfiles bloqueados.</div>}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ✅ Movimientos recientes + anular */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Movimientos recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentTx.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aún no hay movimientos.</p>
          ) : (
            recentTx.map((tx) => {
              const tone = tx.type === 'ganancia' ? 'emerald' : tx.type === 'gasto' ? 'red' : 'amber';
              const sign = tx.type === 'ganancia' ? '+' : tx.type === 'gasto' ? '-' : '';
              return <TxCard key={tx.id} exp={tx} tone={tone} sign={sign} onVoid={openVoid} />;
            })
          )}
        </CardContent>
      </Card>

      {/* ✅ Modal Mensaje listo */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mensaje listo para enviar</DialogTitle>
            <DialogDescription className="text-white/70">
              Puedes copiar el mensaje o abrir WhatsApp con el texto cargado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea className="glass-input min-h-[260px]" value={finalMessage} onChange={(e) => setFinalMessage(e.target.value)} />

            <div className="flex flex-col md:flex-row gap-2">
              <Button onClick={handleCopy} className="bg-primary hover:bg-primary/90 text-white w-full">
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>

              <Button
                onClick={handleOpenWhatsApp}
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" /> Abrir WhatsApp
              </Button>
            </div>

            <p className="text-xs text-white/60">
              Variables disponibles en plantilla: <code>{'{{serviceName}}'}</code> <code>{'{{accountEmail}}'}</code>{' '}
              <code>{'{{accountPassword}}'}</code> <code>{'{{profileName}}'}</code> <code>{'{{pin}}'}</code>{' '}
              <code>{'{{endDate}}'}</code>
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setMessageOpen(false)} className="bg-primary hover:bg-primary/90 text-white">
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal Anular movimiento */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" /> Anular movimiento
            </DialogTitle>
            <DialogDescription className="text-white/70">
              No se elimina el registro; solo se marca como anulado para que no cuente en totales.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {voidTarget && (
              <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                <p className="text-sm text-white font-medium">{voidTarget.description}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(voidTarget.date), 'dd MMM yyyy HH:mm')}</p>
                <p className="text-sm text-white mt-2">
                  Monto: <span className="font-bold">{money(voidTarget.amount)}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Motivo (opcional)</label>
              <Textarea
                className="glass-input min-h-[120px]"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Ej. Duplicado / error de monto / devolución..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setVoidOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={confirmVoid} className="bg-red-600 hover:bg-red-700 text-white">
              Anular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
