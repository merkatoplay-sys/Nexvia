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
  const { getStats, accounts, renewAccount, renewProfile, getServiceColor } = useStreaming();
  const [, navigate] = useLocation();
  const stats = getStats();

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  const expiringSoonAccounts = accounts.filter(acc => {
    const days = differenceInDays(new Date(acc.expirationDate), new Date());
    return days <= 3 && days >= 0;
  });

  const expiringSoonProfiles = accounts.flatMap(acc =>
    (acc.profiles ?? [])
      .filter(p => p.status === 'activo' && p.endDate)
      .filter(p => {
        const days = differenceInDays(new Date(p.endDate!), new Date());
        return days <= 3 && days >= 0;
      })
      .map(p => ({ ...p, accountId: acc.id, accountName: acc.serviceName }))
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

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" /> Cuentas Maestras por Vencer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringSoonAccounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">Todas tus cuentas están activas</p>
              ) : (
                <div className="space-y-3">
                  {expiringSoonAccounts.map(acc => (
                    <div key={acc.id} className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                            style={{ backgroundColor: getServiceColor(acc.serviceName) }}
                          >
                            {acc.serviceName.substring(0, 1)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{acc.serviceName}</p>
                            <p className="text-xs text-muted-foreground">{acc.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-orange-400">
                          {differenceInDays(new Date(acc.expirationDate), new Date())} días restantes
                        </span>
                        <Button
                          size="sm"
                          onClick={() => renewAccount(acc.id)}
                          className="h-7 text-xs bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400"
                        >
                          <RotateCw className="h-3 w-3 mr-1" /> Renovar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" /> Perfiles por Vencer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringSoonProfiles.length === 0 ? (
                <p className="text-muted-foreground text-sm">Todos los perfiles están vigentes</p>
              ) : (
                <div className="space-y-3">
                  {expiringSoonProfiles.map(profile => (
                    <div
                      key={`${profile.accountId}-${profile.id}`}
                      className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-white">{profile.name}</p>
                          <p className="text-xs text-muted-foreground">{profile.accountName}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-orange-400">
                          {differenceInDays(new Date(profile.endDate!), new Date())} días restantes
                        </span>
                        <Button
                          size="sm"
                          onClick={() => renewProfile(profile.accountId as string, profile.id, profile.price || 5)}
                          className="h-7 text-xs bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400"
                        >
                          <RotateCw className="h-3 w-3 mr-1" /> Renovar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              {accounts.slice(0, 5).map(acc => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => navigate(`/account/${acc.id}`)}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: getServiceColor(acc.serviceName) }}
                    >
                      {acc.serviceName.substring(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{acc.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{acc.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {(acc.profiles ?? []).filter(p => p.status === 'activo').length} / {acc.totalProfiles} perfiles
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
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
