import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Ban } from 'lucide-react';

import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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

const money = (n: any) => Number(n ?? 0).toFixed(2);

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

  const amountColor =
    tone === 'emerald'
      ? 'text-emerald-400'
      : tone === 'red'
        ? 'text-red-400'
        : 'text-amber-400';

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

          <p className="text-xs text-muted-foreground">
            {format(new Date(exp.date), 'dd MMM yyyy HH:mm')}
          </p>

          {exp.reference && <p className="text-xs text-muted-foreground">Ref: {exp.reference}</p>}

          {isVoided && (
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {exp.voidedAt && (
                <p>
                  <span className="text-white/80">Anulado:</span>{' '}
                  {format(new Date(exp.voidedAt), 'dd MMM yyyy HH:mm')}
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
            {sign}${money(exp.amount)}
          </p>

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => onVoid(exp)}
            disabled={isVoided}
            title={isVoided ? 'Este movimiento ya está anulado' : 'Anular movimiento'}
          >
            <Ban className="h-3.5 w-3.5 mr-1" />
            Anular
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Finances() {
  const { expenses, getStats, voidExpense } = useStreaming();

  const [openVoid, setOpenVoid] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [saving, setSaving] = useState(false);

  const expensesSafe = Array.isArray(expenses) ? (expenses as Tx[]) : [];
  const stats = getStats();

  const { ganancias, gastos, ajustes } = useMemo(() => {
    const sorted = (arr: Tx[]) =>
      [...arr].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      ganancias: sorted(expensesSafe.filter(e => e.type === 'ganancia')),
      gastos: sorted(expensesSafe.filter(e => e.type === 'gasto')),
      ajustes: sorted(expensesSafe.filter(e => e.type === 'ajuste')),
    };
  }, [expensesSafe]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  const openVoidModal = (exp: Tx) => {
    setSelectedTx(exp);
    setVoidReason('');
    setOpenVoid(true);
  };

  const confirmVoid = async () => {
    if (!selectedTx) return;
    if (selectedTx.isVoided) return;

    const reason = voidReason.trim();
    if (!reason) return;

    try {
      setSaving(true);
      const ok = await voidExpense(selectedTx.id, reason);
      if (ok) setOpenVoid(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Finanzas</h1>
          <p className="text-muted-foreground">
            Historial completo de movimientos contables: ganancias, gastos y ajustes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display text-emerald-400">
                  ${money(stats.totalSales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ganancias.filter(g => !g.isVoided).length} transacciones (válidas)
                </p>
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
                <div className="text-2xl font-bold font-display text-red-400">
                  ${money(stats.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {gastos.filter(g => !g.isVoided).length} transacciones (válidas)
                </p>
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
                  ${money(stats.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margen {stats.totalSales > 0 ? Math.round((stats.netProfit / stats.totalSales) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Card className="glass-card border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-400" /> Gestionar Movimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Para registrar renovaciones, devoluciones y ajustes, ve a la sección{' '}
              <strong className="text-primary">Renovaciones y Ajustes</strong>.
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3 list-disc">
              <li>Renovar cuentas maestras (se registran como GASTOS)</li>
              <li>Renovar perfiles vendidos (se registran como GANANCIAS)</li>
              <li>Procesar devoluciones (se registran como GASTOS)</li>
              <li>Si un movimiento fue un error, usa <strong className="text-white/90">Anular</strong> (no se borra, solo deja de contar)</li>
            </ul>
          </CardContent>
        </Card>

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
                      <TxCard key={exp.id} exp={exp} tone="emerald" sign="+" onVoid={openVoidModal} />
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
                      <TxCard key={exp.id} exp={exp} tone="red" sign="-" onVoid={openVoidModal} />
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
                      <TxCard key={exp.id} exp={exp} tone="amber" sign="" onVoid={openVoidModal} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      <Dialog open={openVoid} onOpenChange={setOpenVoid}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-300" /> Anular movimiento
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esto <strong>NO borra</strong> el movimiento. Solo lo marca como anulado para que <strong>no cuente</strong> en tus estadísticas.
            </DialogDescription>
          </DialogHeader>

          {selectedTx && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <div className="flex-1">
                  <p className="text-white font-medium">{selectedTx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedTx.date), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
                <p className="text-white/90 font-bold">
                  {selectedTx.type === 'ganancia' ? '+' : selectedTx.type === 'gasto' ? '-' : ''}
                  ${money(selectedTx.amount)}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Motivo (requerido)</p>
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Ej: Cuenta creada por error, no se compró realmente."
              className="min-h-[90px]"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setOpenVoid(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmVoid}
              disabled={saving || !voidReason.trim() || !!selectedTx?.isVoided}
              className="bg-red-500/80 hover:bg-red-500 text-white"
            >
              {saving ? 'Anulando...' : 'Confirmar anulación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
