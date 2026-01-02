import { useStreaming } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp, AlertTriangle, RotateCw, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { differenceInDays } from 'date-fns';

const money = (v: any) =>
  `$${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Dashboard() {
  const { getStats, accounts, services, renewAccount, renewProfile, getServiceColor } = useStreaming();
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
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido de nuevo. Aquí está el resumen de tu negocio.</p>
        </div>
        <Button
          onClick={() => navigate('/sales')}
          className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]"
        >
          <ShoppingCart className="mr-2 h-4 w-4" /> Hacer Venta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-white">{money(stats.totalSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Por venta de perfiles</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia Neta</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-emerald-500 neon-text">{money(stats.netProfit)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Margen actual del {stats.totalSales > 0 ? Math.round((stats.netProfit / stats.totalSales) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cuentas Activas</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-white">{stats.activeAccounts}</div>
              <p className="text-xs text-muted-foreground mt-1">Total gestionadas</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Por Vencer</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-orange-500">
                {expiringSoonAccounts.length + expiringSoonProfiles.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">En los próximos 3 días</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Cuentas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-white"
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

                      <div>
                        <p className="text-sm font-medium text-white">{serviceName}</p>
                        <p className="text-xs text-muted-foreground">{acc.email}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {(acc.profiles ?? []).filter((p: any) => p.status === 'activo').length} / {acc.totalProfiles} perfiles
                      </p>
                      <Badge className={acc.status === 'activa' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}>
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
