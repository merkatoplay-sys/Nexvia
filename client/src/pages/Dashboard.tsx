import { useStreaming } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users, DollarSign, TrendingUp, AlertTriangle, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const money = (v: any) =>
  `$${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const buildDisplayName = (serviceName: string, planName?: any) => {
  const plan = String(planName ?? '').trim();
  return plan ? `${serviceName} ${plan}` : serviceName;
};

type RenewalTarget =
  | { open: false; type: null; accountId: ''; profileId: ''; title: '' }
  | { open: true; type: 'cuenta' | 'perfil'; accountId: string; profileId: string; title: string };

export default function Dashboard() {
  const {
    getStats,
    accounts,
    services,
    getServiceColor,
    renewAccountMaster,
    renewProfileSale,
    releaseProfile,
  } = useStreaming();

  const [, navigate] = useLocation();

  const stats = getStats();
  const accountsSafe = accounts ?? [];
  const servicesSafe = services ?? [];

  const [expiringOpen, setExpiringOpen] = useState(false);

  const [renewalTarget, setRenewalTarget] = useState<RenewalTarget>({
    open: false,
    type: null,
    accountId: '',
    profileId: '',
    title: '',
  });

  const [renewalDays, setRenewalDays] = useState<number>(30);
  const [renewalCost, setRenewalCost] = useState<number>(0);
  const [isSubmittingRenewal, setIsSubmittingRenewal] = useState(false);

  const getServiceForAccount = (acc: any) => {
    if (!acc) return null;
    const byId = acc.serviceId ? servicesSafe.find((s: any) => s.id === acc.serviceId) : null;
    if (byId) return byId;
    if (acc.serviceName) return servicesSafe.find((s: any) => s.name === acc.serviceName) ?? null;
    return null;
  };

  const getServiceNameForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    const base = svc?.name ?? acc?.serviceName ?? 'Servicio';
    return buildDisplayName(base, acc?.planName);
  };

  const getServiceColorForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return svc?.color ?? (getServiceColor?.(getServiceNameForAccount(acc)) as string) ?? '#6366f1';
  };

  const getServiceImageForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return svc?.imageUrl || '';
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { y: 14, opacity: 0 }, show: { y: 0, opacity: 1 } };

  const expiringSoonAccounts = useMemo(() => {
    return accountsSafe.filter((acc: any) => {
      if (!acc?.expirationDate) return false;
      const days = differenceInDays(new Date(acc.expirationDate), new Date());
      return days <= 3 && days >= 0;
    });
  }, [accountsSafe]);

  const expiringSoonProfiles = useMemo(() => {
    return accountsSafe.flatMap((acc: any) =>
      (acc.profiles ?? [])
        .filter((p: any) => p.status === 'activo' && p.endDate)
        .filter((p: any) => {
          const days = differenceInDays(new Date(p.endDate!), new Date());
          return days <= 3 && days >= 0;
        })
        .map((p: any) => ({
          ...p,
          accountId: acc.id,
          accountTitle: getServiceNameForAccount(acc),
          accountEmail: acc.email,
        }))
    );
  }, [accountsSafe]);

  const expiringItems = useMemo(() => {
    const accItems = expiringSoonAccounts.map((acc: any) => ({
      type: 'cuenta' as const,
      daysLeft: differenceInDays(new Date(acc.expirationDate), new Date()),
      accountId: acc.id,
      title: getServiceNameForAccount(acc),
      subtitle: acc.email,
      suggestedCost: Number(acc.cost || 0),
    }));

    const profItems = expiringSoonProfiles.map((p: any) => ({
      type: 'perfil' as const,
      daysLeft: differenceInDays(new Date(p.endDate!), new Date()),
      accountId: p.accountId,
      profileId: p.id,
      title: p.name || 'Perfil',
      subtitle: `${p.accountTitle} • ${p.accountEmail}`,
      suggestedCost: Number(p.price || 0),
    }));

    return [...accItems, ...profItems].sort((a, b) => a.daysLeft - b.daysLeft);
  }, [expiringSoonAccounts, expiringSoonProfiles]);

  const expiringTotal = expiringSoonAccounts.length + expiringSoonProfiles.length;

  const handleQuickRenew = async (it: any) => {
    try {
      let ok = false;

      if (it.type === 'cuenta') {
        ok = await renewAccountMaster(it.accountId, 30, Number(it.suggestedCost || 0));
      } else {
        ok = await renewProfileSale(it.accountId, it.profileId, 30, Number(it.suggestedCost || 0));
      }

      if (ok) {
        toast.success('Renovado 30 días');
        setExpiringOpen(false);
      }
    } catch {
      toast.error('Error al renovar');
    }
  };

  const handleReleaseProfile = async (item: any) => {
    if (item.type !== 'perfil') return;
    if (!confirm('¿Liberar perfil?')) return;
    await releaseProfile(item.profileId);
    toast.success('Perfil liberado');
    setExpiringOpen(false);
  };

  const openRenewDialog = (item: any) => {
    setRenewalDays(30);
    setRenewalCost(Number(item.suggestedCost || 0));
    setRenewalTarget({
      open: true,
      type: item.type,
      accountId: item.accountId,
      profileId: item.profileId ?? '',
      title: item.title,
    });
  };

  const closeRenewDialog = () => {
    setRenewalTarget({ open: false, type: null, accountId: '', profileId: '', title: '' });
  };

  const handleConfirmRenewal = async () => {
    if (!renewalTarget.open || !renewalTarget.type) return;

    let ok = false;

    if (renewalTarget.type === 'cuenta') {
      ok = await renewAccountMaster(renewalTarget.accountId, renewalDays, renewalCost);
    } else {
      ok = await renewProfileSale(
        renewalTarget.accountId,
        renewalTarget.profileId,
        renewalDays,
        renewalCost
      );
    }

    if (ok) {
      toast.success('Renovado');
      closeRenewDialog();
      setExpiringOpen(false);
    }
  };

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        
        <div className="flex justify-between">
          <h1 className="text-2xl text-white font-bold">Dashboard</h1>
          <Button onClick={() => navigate('/sales')}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Venta
          </Button>
        </div>

        <Card onClick={() => expiringTotal > 0 && setExpiringOpen(true)} className="cursor-pointer">
          <CardHeader>
            <CardTitle>Por vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl text-orange-400">{expiringTotal}</div>
          </CardContent>
        </Card>

      </motion.div>

      {/* MODAL */}
      <Dialog open={expiringOpen} onOpenChange={setExpiringOpen}>
        <DialogContent className="text-white">
          <DialogHeader>
            <DialogTitle>Por vencer</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {expiringItems.map((it: any) => (
              <div key={it.profileId || it.accountId} className="p-3 bg-white/5 rounded">
                
                <p className="text-sm">{it.title}</p>
                <p className="text-xs text-muted-foreground">{it.subtitle}</p>

                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => handleQuickRenew(it)}>30d</Button>
                  <Button size="sm" variant="outline" onClick={() => openRenewDialog(it)}>+</Button>

                  {it.type === 'perfil' && (
                    <Button size="sm" variant="destructive" onClick={() => handleReleaseProfile(it)}>
                      Liberar
                    </Button>
                  )}
                </div>

              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PERSONALIZADO */}
      <Dialog open={renewalTarget.open} onOpenChange={closeRenewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar</DialogTitle>
          </DialogHeader>

          <Input type="number" value={renewalDays} onChange={(e) => setRenewalDays(+e.target.value)} />
          <Input type="number" value={renewalCost} onChange={(e) => setRenewalCost(+e.target.value)} />

          <DialogFooter>
            <Button onClick={handleConfirmRenewal}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}