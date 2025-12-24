import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Finances() {
  const { expenses, getStats } = useStreaming();
  const stats = getStats();

  const ganancias = expenses.filter(e => e.type === 'ganancia').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const gastos = expenses.filter(e => e.type === 'gasto').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const ajustes = expenses.filter(e => e.type === 'ajuste').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
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
        <h1 className="text-3xl font-display font-bold text-white mb-2">Finanzas</h1>
        <p className="text-muted-foreground">Historial completo de movimientos contables: ganancias, gastos y ajustes.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-emerald-400">${stats.totalSales}</div>
              <p className="text-xs text-muted-foreground mt-1">{ganancias.length} transacciones</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Totales</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-red-400">${stats.totalExpenses}</div>
              <p className="text-xs text-muted-foreground mt-1">{gastos.length} transacciones</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia Neta</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-display ${stats.netProfit >= 0 ? 'text-white neon-text' : 'text-red-400'}`}>
                ${stats.netProfit}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margen {stats.totalSales > 0 ? Math.round((stats.netProfit / stats.totalSales) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Información de renovaciones */}
      <Card className="glass-card border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-400" /> Gestionar Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Para registrar renovaciones, devoluciones y ajustes, ve a la sección <strong className="text-primary">Renovaciones y Ajustes</strong>.</p>
          <p className="text-xs text-muted-foreground">Desde ahí puedes:</p>
          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3 list-disc">
            <li>Renovar cuentas maestras (se registran como GASTOS)</li>
            <li>Renovar perfiles vendidos (se registran como GANANCIAS)</li>
            <li>Procesar devoluciones (se registran como GASTOS)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Historial de Ganancias y Gastos */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Ganancias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ganancias.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin ganancias registradas</p>
                ) : (
                  ganancias.map(exp => (
                    <div key={exp.id} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{exp.description}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(exp.date), 'dd MMM yyyy HH:mm')}</p>
                        </div>
                        <p className="text-sm font-bold text-emerald-400">+${exp.amount}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" /> Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {gastos.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin gastos registrados</p>
                ) : (
                  gastos.map(exp => (
                    <div key={exp.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{exp.description}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(exp.date), 'dd MMM yyyy HH:mm')}</p>
                        </div>
                        <p className="text-sm font-bold text-red-400">-${exp.amount}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" /> Ajustes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ajustes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin ajustes registrados</p>
                ) : (
                  ajustes.map(exp => (
                    <div key={exp.id} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{exp.description}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(exp.date), 'dd MMM yyyy HH:mm')}</p>
                          {exp.reference && <p className="text-xs text-muted-foreground">Ref: {exp.reference}</p>}
                        </div>
                        <p className="text-sm font-bold text-amber-400">${exp.amount}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
