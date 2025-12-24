import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, RotateCw, RotateCcw, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type RenovationType = 'account' | 'profile' | 'refund' | null;

export default function Renovaciones() {
  const { accounts, renewAccountMaster, renewProfileSale, processRefund, recordAdjustment } = useStreaming();
  const [renovationType, setRenovationType] = useState<RenovationType>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [renewalDays, setRenewalDays] = useState<number>(30);
  const [cost, setCost] = useState<number>(0);
  const [refundData, setRefundData] = useState({ amount: 0, reason: '' });

  const handleStartRenewal = (type: RenovationType) => {
    setRenovationType(type);
    setSelectedAccount('');
    setSelectedProfile('');
    setRenewalDays(30);
    setCost(0);
    setRefundData({ amount: 0, reason: '' });
    setIsDialogOpen(true);
  };

  const handleConfirmRenewal = () => {
    if (!selectedAccount) {
      toast.error('Selecciona una cuenta');
      return;
    }

    if (renovationType === 'account') {
      if (cost <= 0) {
        toast.error('Ingresa el costo de renovación');
        return;
      }
      renewAccountMaster(selectedAccount, renewalDays, cost);
    } else if (renovationType === 'profile') {
      if (!selectedProfile) {
        toast.error('Selecciona un perfil');
        return;
      }
      if (cost <= 0) {
        toast.error('Ingresa el costo de renovación');
        return;
      }
      renewProfileSale(selectedAccount, selectedProfile, renewalDays, cost);
    }

    setIsDialogOpen(false);
    setRenovationType(null);
  };

  const handleProcessRefund = () => {
    if (!selectedProfile || refundData.amount <= 0 || !refundData.reason) {
      toast.error('Completa todos los campos');
      return;
    }
    processRefund(selectedProfile, refundData.amount, refundData.reason);
    setIsDialogOpen(false);
    setRenovationType(null);
  };

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);
  const selectedProfileData = selectedAccountData?.profiles.find(p => p.id === selectedProfile);

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
        <h1 className="text-3xl font-display font-bold text-white mb-2">Renovaciones y Ajustes</h1>
        <p className="text-muted-foreground">Gestiona todas las renovaciones, devoluciones y ajustes contables.</p>
      </div>

      {/* Opciones Principales */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={item}>
          <Dialog open={isDialogOpen && renovationType === 'account'} onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
              setRenovationType(null);
            }
          }}>
            <DialogTrigger asChild>
              <div 
                onClick={() => handleStartRenewal('account')}
                className="cursor-pointer"
              >
                <Card className="glass-card hover:border-primary/50 transition-all hover:shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <RotateCw className="h-5 w-5 text-blue-400" /> Renovar Cuenta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Extiende la suscripción de una cuenta maestra. Se registra automáticamente como GASTO.</p>
                  </CardContent>
                </Card>
              </div>
            </DialogTrigger>

            <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Renovar Cuenta Maestra</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecciona la cuenta</label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Elige una cuenta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.serviceName} - {acc.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Días de renovación</label>
                    <Input 
                      type="number" 
                      min="1"
                      value={renewalDays}
                      onChange={e => setRenewalDays(parseInt(e.target.value) || 30)}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Costo</label>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={cost}
                      onChange={e => setCost(parseFloat(e.target.value) || 0)}
                      className="glass-input"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {selectedAccountData && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-sm">
                    <p className="text-blue-200"><strong>Resumen:</strong></p>
                    <p className="text-blue-200/80">Cuenta: {selectedAccountData.serviceName}</p>
                    <p className="text-blue-200/80">Vence: {format(new Date(selectedAccountData.expirationDate), 'dd MMM yyyy')}</p>
                    <p className="text-blue-200/80">Nueva fecha: {format(new Date(new Date(selectedAccountData.expirationDate).getTime() + renewalDays * 24 * 60 * 60 * 1000), 'dd MMM yyyy')}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10">Cancelar</Button>
                <Button onClick={handleConfirmRenewal} className="bg-primary text-white">Confirmar Renovación</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        <motion.div variants={item}>
          <Dialog open={isDialogOpen && renovationType === 'profile'} onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
              setRenovationType(null);
            }
          }}>
            <DialogTrigger asChild>
              <div 
                onClick={() => handleStartRenewal('profile')}
                className="cursor-pointer"
              >
                <Card className="glass-card hover:border-primary/50 transition-all hover:shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <RotateCw className="h-5 w-5 text-emerald-400" /> Renovar Perfil
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Extiende la suscripción de un perfil vendido. Se registra automáticamente como GANANCIA.</p>
                  </CardContent>
                </Card>
              </div>
            </DialogTrigger>

            <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Renovar Perfil Vendido</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecciona la cuenta maestra</label>
                  <Select value={selectedAccount} onValueChange={(val) => {
                    setSelectedAccount(val);
                    setSelectedProfile('');
                  }}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Elige una cuenta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.serviceName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAccountData && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selecciona el perfil</label>
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Elige un perfil" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-white/10 text-white">
                        {selectedAccountData.profiles
                          .filter(p => p.status !== 'disponible' && p.endDate)
                          .map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name} - {profile.clientId || 'Sin cliente'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Días de renovación</label>
                    <Input 
                      type="number" 
                      min="1"
                      value={renewalDays}
                      onChange={e => setRenewalDays(parseInt(e.target.value) || 30)}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Precio</label>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={cost}
                      onChange={e => setCost(parseFloat(e.target.value) || 0)}
                      className="glass-input"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {selectedProfileData && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-sm">
                    <p className="text-emerald-200"><strong>Resumen:</strong></p>
                    <p className="text-emerald-200/80">Perfil: {selectedProfileData.name}</p>
                    <p className="text-emerald-200/80">Cliente: {selectedProfileData.clientId || 'N/A'}</p>
                    {selectedProfileData.endDate && (
                      <>
                        <p className="text-emerald-200/80">Vence: {format(new Date(selectedProfileData.endDate), 'dd MMM yyyy')}</p>
                        <p className="text-emerald-200/80">Nueva fecha: {format(new Date(new Date(selectedProfileData.endDate).getTime() + renewalDays * 24 * 60 * 60 * 1000), 'dd MMM yyyy')}</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10">Cancelar</Button>
                <Button onClick={handleConfirmRenewal} className="bg-primary text-white">Confirmar Renovación</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        <motion.div variants={item}>
          <Dialog open={isDialogOpen && renovationType === 'refund'} onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
              setRenovationType(null);
            }
          }}>
            <DialogTrigger asChild>
              <div 
                onClick={() => handleStartRenewal('refund')}
                className="cursor-pointer"
              >
                <Card className="glass-card hover:border-primary/50 transition-all hover:shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-red-400" /> Registrar Devolución
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Procesa una devolución parcial o total. Se registra automáticamente como GASTO.</p>
                  </CardContent>
                </Card>
              </div>
            </DialogTrigger>

            <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Registrar Devolución</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecciona el perfil</label>
                  <Select value={selectedAccount} onValueChange={(val) => {
                    setSelectedAccount(val);
                    setSelectedProfile('');
                  }}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Elige una cuenta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-white">
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.serviceName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAccountData && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Perfil a devolver</label>
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Elige un perfil" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-white/10 text-white">
                        {selectedAccountData.profiles
                          .filter(p => p.status !== 'disponible')
                          .map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name} - ${profile.price || 0}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Monto de devolución</label>
                  <Input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={refundData.amount}
                    onChange={e => setRefundData({...refundData, amount: parseFloat(e.target.value) || 0})}
                    className="glass-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Motivo de la devolución</label>
                  <Textarea 
                    value={refundData.reason}
                    onChange={e => setRefundData({...refundData, reason: e.target.value})}
                    placeholder="Ej: Servicio falló, Error de cuenta, Cliente insatisfecho..."
                    className="glass-input min-h-24"
                  />
                </div>

                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-200">Se registrará como GASTO por ${refundData.amount}</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10">Cancelar</Button>
                <Button onClick={handleProcessRefund} className="bg-destructive text-white">Confirmar Devolución</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>

      {/* Información */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" /> Cómo Funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="text-white font-medium mb-1">✓ Renovar Cuenta Maestra</p>
            <p>Extiende la suscripción de una cuenta. Se registra automáticamente como GASTO en finanzas.</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">✓ Renovar Perfil Vendido</p>
            <p>Extiende la suscripción de un perfil que ya fue vendido a un cliente. Se registra automáticamente como GANANCIA en finanzas.</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">✓ Registrar Devolución</p>
            <p>Procesa una devolución a un cliente. Se registra automáticamente como GASTO en finanzas con la razón indicada.</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
