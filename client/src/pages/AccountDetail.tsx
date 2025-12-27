import { useStreaming } from '@/context/StreamingContext';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, User, Zap, RotateCw } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function AccountDetail() {
  const [, params] = useRoute('/account/:id');
  const [, navigate] = useLocation();
  const { accounts, renewAccount, renewProfile } = useStreaming();

  const accountId = params?.id ? parseInt(params.id) : null;
  const account = accounts.find(acc => acc.id === accountId);

  if (!account) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </div>
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">Cuenta no encontrada</p>
        </div>
      </div>
    );
  }

  const daysLeft = differenceInDays(new Date(account.expirationDate), new Date());
  const activeProfiles = account.profiles.filter(p => p.status === 'activo');
  const expiredProfiles = account.profiles.filter(p => p.status === 'vencido');
  const availableProfiles = account.profiles.filter(p => p.status === 'disponible');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header con botón volver */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">{account.serviceName}</h1>
            <p className="text-muted-foreground">{account.email}</p>
          </div>
        </div>
        
        <Button 
          onClick={() => renewAccount(account.id)} 
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <RotateCw className="mr-2 h-4 w-4" /> Renovar Cuenta
        </Button>
      </div>

      {/* Información Principal */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={account.status === 'activa' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}>
              {account.status}
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Días Restantes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold font-display ${daysLeft > 5 ? 'text-emerald-400' : 'text-orange-400'}`}>
              {daysLeft}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Costo Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-display text-white">${account.cost}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Precio/Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-display text-primary">${account.pricePerProfile}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fechas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Fecha de Inicio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-white">{format(new Date(account.startDate), 'dd MMM yyyy')}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Zap className="h-4 w-4" /> Fecha de Vencimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-orange-400">{format(new Date(account.expirationDate), 'dd MMM yyyy')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Perfiles */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Perfiles Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">{activeProfiles.length}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">{expiredProfiles.length}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">{availableProfiles.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista Detallada de Perfiles */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Perfiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {account.profiles.map((profile) => {
              const daysUntilExpiration = profile.endDate ? differenceInDays(new Date(profile.endDate), new Date()) : null;
              const canRenew = profile.status === 'activo' && daysUntilExpiration !== null && daysUntilExpiration <= 1;

              return (
                <div key={profile.id} className={`p-4 rounded-lg border transition-all
                  ${profile.status === 'activo' ? 'bg-emerald-500/10 border-emerald-500/20' : 
                    profile.status === 'vencido' ? 'bg-red-500/10 border-red-500/20' : 
                    'bg-white/5 border-white/10'}`}>
                  
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white">{profile.name}</p>
                      {profile.phone && <p className="text-xs text-muted-foreground">{profile.phone}</p>}
                    </div>
                    <Badge className={
                      profile.status === 'activo' ? 'bg-emerald-500/20 text-emerald-400' :
                      profile.status === 'vencido' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }>
                      {profile.status}
                    </Badge>
                  </div>

                  {profile.status !== 'disponible' && (
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground text-xs">Inicio: </span>
                        <p className="text-white">{profile.startDate ? format(new Date(profile.startDate), 'dd MMM') : '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Vence: </span>
                        <p className={daysUntilExpiration !== null && daysUntilExpiration <= 1 ? 'text-orange-400 font-bold' : 'text-white'}>
                          {profile.endDate ? format(new Date(profile.endDate), 'dd MMM') : '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  {canRenew && (
                    <Button 
                      onClick={() => renewProfile(account.id, profile.id, parseFloat(profile.price || account.pricePerProfile || '0'))}
                      className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary text-sm"
                    >
                      <RotateCw className="mr-2 h-3 w-3" /> Renovar Perfil
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
