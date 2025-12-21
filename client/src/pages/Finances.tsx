import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Finances() {
  const { accounts, expenses, addExpense, renewAccount, getStats } = useStreaming();
  const stats = getStats();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false);
  const [selectedAccountToRenew, setSelectedAccountToRenew] = useState<string>('');
  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: 0,
    type: 'gasto' as 'ganancia' | 'gasto'
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
    setExpenseData({ description: '', amount: 0, type: 'gasto' });
  };

  const ganancias = expenses.filter(e => e.type === 'ganancia').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const gastos = expenses.filter(e => e.type === 'gasto').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
        
        <div className="flex gap-2">
          <Dialog open={isRenewDialogOpen} onOpenChange={setIsRenewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 text-black">
                <RotateCw className="mr-2 h-4 w-4" /> Renovar Cuenta
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Renovar Cuenta Maestra</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Selecciona la cuenta</label>
                  <Select value={selectedAccountToRenew} onValueChange={setSelectedAccountToRenew}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Elige una cuenta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.serviceName} - ${acc.cost}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedAccountToRenew && (
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-sm text-muted-foreground">Costo de renovación:</p>
                    <p className="text-xl font-bold text-secondary">
                      ${accounts.find(a => a.id === selectedAccountToRenew)?.cost || 0}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRenewDialogOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
                <Button 
                  onClick={() => {
                    if (selectedAccountToRenew) {
                      renewAccount(selectedAccountToRenew);
                      setIsRenewDialogOpen(false);
                      setSelectedAccountToRenew('');
                    }
                  }} 
                  className="bg-secondary text-black"
                >
                  Renovar Cuenta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-destructive hover:bg-destructive/90 text-white">
                <Plus className="mr-2 h-4 w-4" /> Registrar Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Gasto</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Descripción</label>
                  <Input 
                    className="glass-input" 
                    placeholder="Ej: Renovación adicional"
                    value={expenseData.description} 
                    onChange={e => setExpenseData({...expenseData, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Monto</label>
                    <Input 
                      type="number" 
                      className="glass-input" 
                      value={expenseData.amount} 
                      onChange={e => setExpenseData({...expenseData, amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Tipo</label>
                    <Select value={expenseData.type} onValueChange={val => setExpenseData({...expenseData, type: val as 'ganancia' | 'gasto'})}>
                      <SelectTrigger className="glass-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-white/10 text-white">
                        <SelectItem value="gasto">Gasto</SelectItem>
                        <SelectItem value="ganancia">Ganancia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
                <Button onClick={handleAddExpense} className="bg-primary text-white">Registrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Historial de Ganancias y Gastos */}
      <div className="grid gap-6 md:grid-cols-2">
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
      </div>
    </motion.div>
  );
}
