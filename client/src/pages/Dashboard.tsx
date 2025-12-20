import { useStreaming } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, AlertTriangle, ArrowUpRight, MonitorPlay } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { getStats, accounts } = useStreaming();
  const [, navigate] = useLocation();
  const stats = getStats();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido de nuevo. Aquí está el resumen de tu negocio.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-white">${stats.totalSales}</div>
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
              <div className="text-2xl font-bold font-display text-emerald-500 neon-text">${stats.netProfit}</div>
              <p className="text-xs text-muted-foreground mt-1">Margen actual del {stats.totalSales > 0 ? Math.round((stats.netProfit / stats.totalSales) * 100) : 0}%</p>
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
              <div className="text-2xl font-bold font-display text-orange-500">{stats.expiringSoon}</div>
              <p className="text-xs text-muted-foreground mt-1">En los próximos 3 días</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions / Recent Activity Area could go here */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <motion.div variants={item} className="col-span-4">
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="text-white">Cuentas Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.slice(0, 5).map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate(`/account/${acc.id}`)}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                        ${acc.serviceName === 'Netflix' ? 'bg-red-600' : 
                          acc.serviceName === 'Spotify' ? 'bg-green-500' : 
                          acc.serviceName === 'Disney+' ? 'bg-blue-600' : 'bg-primary'}`}>
                        {acc.serviceName.substring(0, 1)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{acc.serviceName}</p>
                        <p className="text-xs text-muted-foreground">{acc.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{acc.profiles.filter(p => p.status === 'activo').length} / {acc.totalProfiles} perfiles</p>
                      <p className={`text-xs ${acc.status === 'por vencer' ? 'text-orange-500' : 'text-emerald-500'}`}>
                        {acc.status === 'por vencer' ? 'Vence pronto' : 'Activa'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="col-span-3">
           <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="text-white">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-primary cursor-pointer hover:bg-primary/20 transition-colors flex items-center">
                <Users className="mr-3 h-5 w-5" />
                Registrar Nuevo Cliente
              </div>
              <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary cursor-pointer hover:bg-secondary/20 transition-colors flex items-center">
                <MonitorPlay className="mr-3 h-5 w-5" />
                Añadir Cuenta Maestra
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
