import { useStreaming } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp, AlertTriangle, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { differenceInDays } from 'date-fns';

const money = (v: any) =>
  `$${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Dashboard() {
  const { getStats, accounts, services, getServiceColor } = useStreaming();
  const [, navigate] = useLocation();

  const stats = getStats();
  const accountsSafe = accounts ?? [];
  const servicesSafe = services ?? [];

  const getServiceForAccount = (acc: any) => {
    if (!acc) return null;
    const byId = acc.serviceId ? servicesSafe.find((s: any) => s.id === acc.serviceId) : null;
    if (byId) return byId;
    if (acc.serviceName) return servicesSafe.find((s: any) => s.name === acc.serviceName) ?? null;
    return null;
  };

  const getServiceNameForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return svc?.name ?? acc?.serviceName ?? 'Servicio';
  };

  const getServiceColorForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return svc?.color ?? (getServiceColor?.(getServiceNameForAccount(acc)) as string) ?? '#6366f1';
  };

  const getServiceImageForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return svc?.imageUrl || '';
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const item = { hidden: { y: 14, opacity: 0 }, show: { y: 0, opacity: 1 } };

  const expiringSoonAccounts = accountsSafe.filter((acc: any) => {
    const days = differenceInDays(new Date(acc.expirationDate), new Date());
    return days <= 3 && days >= 0;
  });

  const expiringSoonProfiles = accountsSafe.flatMap((acc: any) =>
    (acc.profiles ?? [])
      .filter((p: any) => p.status === 'activo' && p.endDate)
      .filter((p: any) => {
        const days = differenceInDays(new Date(p.endDate!), new Date());
        return days <= 3 && days >= 0;
      })
      .map((p: any) => ({
        ...p,
        accountId: acc.id,
        accountName: getServiceNameForAccount(acc),
      }))
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Resumen de tu negocio.</p>
        </div>
        <Button
          onClick={() => navigate('/sales')}
          className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]"
        >
          <ShoppingCart className="mr-2 h-4 w-4" /> Hacer Venta
        </Button>
      </div>

      {/* ✅ Compacto en teléfono: 2 columnas + cards más pequeñas */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-[11px] font-medium text-muted-foreground">Ingresos</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-bold font-display text-white leading-tight">{money(stats.totalSales)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Por perfiles</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-[11px] font-medium text-muted-foreground">Ganancia</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-bold font-display text-emerald-500 neon-text leading-tight">
                {money(stats.netProfit)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {stats.totalSales > 0 ? Math.round((stats.netProfit / stats.totalSales) * 100) : 0}% margen
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-[11px] font-medium text-muted-foreground">Cuentas</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-bold font-display text-white leading-tight">{stats.activeAccounts}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Activas</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-[11px] font-medium text-muted-foreground">Por vencer</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-bold font-display text-orange-500 leading-tight">
                {expiringSoonAccounts.length + expiringSoonProfiles.length}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Próx 3 días</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="py-4">
            <CardTitle className="text-white text-base">Cuentas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accountsSafe.slice(0, 5).map((acc: any) => {
                const serviceName = getServiceNameForAccount(acc);
                const serviceColor = getServiceColorForAccount(acc);
                const serviceImage = getServiceImageForAccount(acc);

                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => navigate(`/account/${acc.id}`)}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0"
                        style={{ backgroundColor: serviceColor }}
                      >
                        {serviceImage ? (
                          <img
                            src={serviceImage}
                            alt={serviceName}
                            className="w-full h-full object-cover"
                            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                          />
                        ) : (
                          serviceName.substring(0, 1)
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{serviceName}</p>
                        <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-white">
                        {(acc.profiles ?? []).filter((p: any) => p.status === 'activo').length} / {acc.totalProfiles}
                      </p>
                      <Badge
                        className={
                          acc.status === 'activa'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-orange-500/20 text-orange-400'
                        }
                      >
                        {acc.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
