import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Ban } from 'lucide-react';

import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

function TxRow({
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

  const amountColor =
    tone === 'emerald' ? 'text-emerald-400' : tone === 'red' ? 'text-red-400' : 'text-amber-400';

  return (
    <div className={['px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors', isVoided ? 'opacity-60' : ''].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-white truncate">{exp.description}</p>

            {isVoided && (
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/80">
                ANULADO
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-0.5">
            <span>{format(new Date(exp.date), 'dd MMM yyyy HH:mm')}</span>
            {exp.reference && <span className="truncate">Ref: {exp.reference}</span>}
          </div>

          {isVoided && (
            <div className="mt-1.5 text-[11px] text-muted-foreground space-y-1">
              {exp.voidedAt && (
                <p>
                  <span className="text-white/80">Anulado:</span> {format(new Date(exp.voidedAt), 'dd MMM yyyy HH:mm')}
                </p>
              )}
              {exp.voidReason && (
                <p className="truncate">
                  <span className="text-white/80">Motivo:</span> {exp.voidReason}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <p className={`text-sm font-bold ${amountColor} whitespace-nowrap`}>
            {sign}${money(exp.amount)}
          </p>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => onVoid(exp)}
            disabled={isVoided}
            title={isVoided ? 'Este movimiento ya está anulado' : 'Anular movimiento'}
          >
            <Ban className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TxList({
  title,
  icon,
  items,
  tone,
  sign,
  onVoid,
}: {
  title: string;
  icon: React.ReactNode;
  items: Tx[];
  tone: 'emerald' | 'red' | 'amber';
  sign: '+' | '-' | '';
  onVoid: (exp: Tx) => void;
}) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
          {icon} {title}
          <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="rounded-lg border border-white/10 overflow-hidden max-h-[70vh] sm:max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Sin movimientos</div>
          ) : (
            <div className="divide-y divide-white/10">
              {items.map((exp) => (
                <TxRow key={exp.id} exp={exp} tone={tone} sign={sign} onVoid={onVoid} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
    const sorted = (arr: Tx[]) => [...arr].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      ganancias: sorted(expensesSafe.filter((e) => e.type === 'ganancia')),
      gastos: sorted(expensesSafe.filter((e) => e.type === 'gasto')),
      ajustes: sorted(expensesSafe.filter((e) => e.type === 'ajuste')),
    };
  }, [expensesSafe]);

  const validGanancias = ganancias.filter((g) => !g.isVoided).length;
  const validGastos = gastos.filter((g) => !g.isVoided).length;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { y: 14, opacity: 0 }, show: { y: 0, opacity: 1 } };

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
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Finanzas</h1>
          <p className="text-muted-foreground">Historial de movimientos: ganancias, gastos y ajustes.</p>
        </div>

        {/* ✅ RESUMEN COMPACTO: 2 columnas en teléfono */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold font-display text-emerald-400">${money(stats.totalSales)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{validGanancias} válidas</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">Gastos</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold font-display text-red-400">${money(stats.totalExpenses)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{validGastos} válidas</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} className="col-span-2 md:col-span-1">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">Neto</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className={[
                    'text-lg sm:text-2xl font-bold font-display',
                    stats.netProfit >= 0 ? 'text-white neon-text' : 'text-red-400',
                  ].join(' ')}
                >
                  ${money(stats.netProfit)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {stats.totalSales > 0 ? Math.round((stats.netProfit / stats.totalSales) * 100) : 0}% margen
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ✅ INFO (más compacta en teléfono) */}
        <Card className="glass-card border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              <span className="hidden sm:inline">Gestionar Movimientos</span>
              <span className="sm:hidden">Guía rápida</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Renovaciones, devoluciones y ajustes están en <strong className="text-primary">Renovaciones y Ajustes</strong>. Si fue error, usa{' '}
              <strong className="text-white/90">Anular</strong> (no se borra, no cuenta).
            </p>
          </CardContent>
        </Card>

        {/* ✅ LISTAS: Tabs en teléfono (no ocupa 3 columnas), 3 columnas en PC */}
        <div className="block md:hidden">
          <Tabs defaultValue="ganancias" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-white/5 border border-white/10">
              <TabsTrigger value="ganancias" className="text-xs">
                + Gan.
              </TabsTrigger>
              <TabsTrigger value="gastos" className="text-xs">
                - Gas.
              </TabsTrigger>
              <TabsTrigger value="ajustes" className="text-xs">
                Aj.
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ganancias" className="mt-3">
              <TxList
                title="Ganancias"
                icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
                items={ganancias}
                tone="emerald"
                sign="+"
                onVoid={openVoidModal}
              />
            </TabsContent>

            <TabsContent value="gastos" className="mt-3">
              <TxList
                title="Gastos"
                icon={<TrendingDown className="h-4 w-4 text-red-400" />}
                items={gastos}
                tone="red"
                sign="-"
                onVoid={openVoidModal}
              />
            </TabsContent>

            <TabsContent value="ajustes" className="mt-3">
              <TxList
                title="Ajustes"
                icon={<AlertCircle className="h-4 w-4 text-amber-400" />}
                items={ajustes}
                tone="amber"
                sign=""
                onVoid={openVoidModal}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden md:grid gap-6 md:grid-cols-3">
          <motion.div variants={item}>
            <TxList
              title="Ganancias"
              icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
              items={ganancias}
              tone="emerald"
              sign="+"
              onVoid={openVoidModal}
            />
          </motion.div>

          <motion.div variants={item}>
            <TxList
              title="Gastos"
              icon={<TrendingDown className="h-4 w-4 text-red-400" />}
              items={gastos}
              tone="red"
              sign="-"
              onVoid={openVoidModal}
            />
          </motion.div>

          <motion.div variants={item}>
            <TxList
              title="Ajustes"
              icon={<AlertCircle className="h-4 w-4 text-amber-400" />}
              items={ajustes}
              tone="amber"
              sign=""
              onVoid={openVoidModal}
            />
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
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{selectedTx.description}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(selectedTx.date), 'dd MMM yyyy HH:mm')}</p>
                </div>
                <p className="text-white/90 font-bold whitespace-nowrap">
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
