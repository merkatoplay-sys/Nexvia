import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Finances() {
  const { accounts, expenses, addExpense, getStats } = useStreaming();
  const stats = getStats();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: 0,
    type: 'otro' as 'renovación' | 'otro'
  });

  const handleAddExpense = () => {
    if (!expenseData.description || !expenseData.amount) {
      return;
    }

    addExpense({
      description: expenseData.description,
      amount: Number(expenseData.amount),
      type: expenseData.type,
      date: new Date().toISOString()
    });

    setIsExpenseDialogOpen(false);
    setExpenseData({ description: '', amount: 0, type: 'otro' });
  };

  // Calcular totales por tipo
  const renewalCosts = expenses.filter(e => e.type === 'renovación').reduce((sum, e) => sum + e.amount, 0);
  const otherCosts = expenses.filter(e => e.type === 'otro').reduce((sum, e) => sum + e.amount, 0);

  // Agrupar gastos por cuenta
  const accountExpenses: { [key: string]: number } = {};
  expenses.forEach(exp => {
    if (exp.accountId) {
      accountExpenses[exp.accountId] = (accountExpenses[exp.accountId] || 0) + exp.amount;
    }
  });

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Finanzas</h1>
          <p className="text-muted-foreground">Ingresos, gastos y ganancias netas.</p>
        </div>
        
        <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-destructive hover:bg-destructive/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> Registrar Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Descripción</label>
                <Input 
                  className="glass-input" 
                  placeholder="Renovación Netflix, etc."
                  value={expenseData.description} 
                  onChange={e => setExpenseData({...expenseData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Tipo</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className={`flex-1 border-white/10 ${expenseData.type === 'renovación' ? 'bg-primary/20 text-primary border-primary/50' : 'hover:bg-white/5 text-white'}`}
                    onClick={() => setExpenseData({...expenseData, type: 'renovación'})}
                  >
                    Renovación
                  </Button>
                  <Button
                    variant="outline"
                    className={`flex-1 border-white/10 ${expenseData.type === 'otro' ? 'bg-destructive/20 text-destructive border-destructive/50' : 'hover:bg-white/5 text-white'}`}
                    onClick={() => setExpenseData({...expenseData, type: 'otro'})}
                  >
                    Otro
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Monto ($)</label>
                <Input 
                  type="number" 
                  className="glass-input" 
                  value={expenseData.amount} 
                  onChange={e => setExpenseData({...expenseData, amount: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
              <Button onClick={handleAddExpense} className="bg-destructive text-white">Registrar Gasto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-emerald-500">${stats.totalSales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Venta de perfiles</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Totales</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-orange-500">${stats.totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Renovaciones y otros</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia Neta</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-primary neon-text">${stats.netProfit.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Después de gastos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Margen</CardTitle>
              <PieChart className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-secondary">
                {stats.totalSales > 0 ? Math.round((stats.netProfit / stats.totalSales) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Margen de ganancia</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Desglose de Gastos */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Desglose de Gastos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-lg bg-white/5 border border-white/5">
                <div>
                  <p className="text-sm text-white font-medium">Renovaciones</p>
                  <p className="text-xs text-muted-foreground">Costo de renovación de cuentas</p>
                </div>
                <p className="text-lg font-bold text-orange-500">${renewalCosts.toFixed(2)}</p>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-white/5 border border-white/5">
                <div>
                  <p className="text-sm text-white font-medium">Otros Gastos</p>
                  <p className="text-xs text-muted-foreground">Otros costos operacionales</p>
                </div>
                <p className="text-lg font-bold text-red-500">${otherCosts.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Gastos por Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {accounts.map(account => (
                  <div key={account.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                    <div>
                      <p className="text-sm text-white font-medium">{account.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{account.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">${account.cost.toFixed(2)}</p>
                      {accountExpenses[account.id] && (
                        <p className="text-xs text-orange-500">+${accountExpenses[account.id].toFixed(2)} renovaciones</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Historial de Gastos */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Historial de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay gastos registrados.</p>
              ) : (
                expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(expense => (
                  <div key={expense.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(expense.date), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-500">-${expense.amount.toFixed(2)}</p>
                      <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded capitalize">
                        {expense.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
