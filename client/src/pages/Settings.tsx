import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bell, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Settings() {
  const { settings, updateSettings } = useStreaming();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSaveNotifications = () => {
    updateSettings({
      notifications: localSettings.notifications
    });
    toast.success('Notificaciones configuradas');
  };

  const handleSaveCurrency = () => {
    updateSettings({
      defaultCurrency: localSettings.defaultCurrency
    });
    toast.success('Moneda actualizada');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Configuración</h1>
        <p className="text-muted-foreground">Personaliza tu experiencia en la aplicación.</p>
      </div>

      {/* Notificaciones */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Activar notificaciones</p>
                <p className="text-xs text-muted-foreground">Recibe alertas sobre vencimientos próximos</p>
              </div>
              <Switch
                checked={localSettings.notifications.enabled}
                onCheckedChange={checked => 
                  setLocalSettings({
                    ...localSettings,
                    notifications: { ...localSettings.notifications, enabled: checked }
                  })
                }
              />
            </div>
          </div>

          {localSettings.notifications.enabled && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Canal de notificación</label>
                <Select 
                  value={localSettings.notifications.channel}
                  onValueChange={channel => 
                    setLocalSettings({
                      ...localSettings,
                      notifications: { ...localSettings.notifications, channel: channel as 'whatsapp' | 'telegram' }
                    })
                  }
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Avisar con</label>
                <Select 
                  value={localSettings.notifications.daysBeforeExpiry.toString()}
                  onValueChange={days => 
                    setLocalSettings({
                      ...localSettings,
                      notifications: { ...localSettings.notifications, daysBeforeExpiry: parseInt(days) as 1 | 3 }
                    })
                  }
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    <SelectItem value="1">1 día antes</SelectItem>
                    <SelectItem value="3">3 días antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Hora de notificación</label>
                <Input
                  type="time"
                  className="glass-input"
                  value={localSettings.notifications.notificationTime}
                  onChange={e => 
                    setLocalSettings({
                      ...localSettings,
                      notifications: { ...localSettings.notifications, notificationTime: e.target.value }
                    })
                  }
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                <p className="text-sm text-blue-200">
                  Recibirás notificaciones por {localSettings.notifications.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} {localSettings.notifications.daysBeforeExpiry} día{localSettings.notifications.daysBeforeExpiry > 1 ? 's' : ''} antes de que venza, a las {localSettings.notifications.notificationTime}
                </p>
              </div>
            </>
          )}

          <Button 
            onClick={handleSaveNotifications}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Guardar Configuración de Notificaciones
          </Button>
        </CardContent>
      </Card>

      {/* Preferencias Generales */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" /> Preferencias Generales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Moneda por defecto</label>
            <Select 
              value={localSettings.defaultCurrency}
              onValueChange={currency => 
                setLocalSettings({
                  ...localSettings,
                  defaultCurrency: currency
                })
              }
            >
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-white/10 text-white">
                <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
            <p className="text-sm text-primary">
              Moneda seleccionada: <strong>{localSettings.defaultCurrency}</strong>
            </p>
          </div>

          <Button 
            onClick={handleSaveCurrency}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Guardar Preferencias
          </Button>
        </CardContent>
      </Card>

      {/* Información del Sistema */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Versión</p>
              <p className="text-sm text-white font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Última actualización</p>
              <p className="text-sm text-white font-medium">Hoy</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="text-sm text-emerald-400 font-medium">En línea</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tema</p>
              <p className="text-sm text-white font-medium">Cyberpunk Dark</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
