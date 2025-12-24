import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bell, Settings as SettingsIcon, Zap, Send } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Settings() {
  const { settings, updateSettings, sendTelegramTestNotification } = useStreaming();
  const [localSettings, setLocalSettings] = useState(settings);
  const [sendingTest, setSendingTest] = useState(false);

  const handleSaveNotifications = () => {
    if (localSettings.notifications.enabled && localSettings.notifications.channel === 'telegram') {
      if (!localSettings.notifications.telegramBotToken || !localSettings.notifications.telegramChatId) {
        toast.error('Completa el token y chat ID de Telegram');
        return;
      }
    }
    updateSettings({ notifications: localSettings.notifications });
    toast.success('Notificaciones configuradas');
  };

  const handleSendTestTelegram = async () => {
    if (!localSettings.notifications.telegramBotToken || !localSettings.notifications.telegramChatId) {
      toast.error('Ingresa el token y chat ID de Telegram primero');
      return;
    }
    setSendingTest(true);
    await sendTelegramTestNotification(localSettings.notifications.telegramBotToken, localSettings.notifications.telegramChatId);
    setSendingTest(false);
  };

  const handleSaveCurrency = () => {
    updateSettings({ defaultCurrency: localSettings.defaultCurrency });
    toast.success('Moneda actualizada');
  };

  const formatTimeDisplay = (time: string): string => {
    if (!time) return '09:00 AM';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
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
              {/* Canal */}
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
                    <SelectItem value="telegram">📱 Telegram</SelectItem>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Días antes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Avisar con anticipación</label>
                <Select 
                  value={localSettings.notifications.daysBeforeExpiry.toString()}
                  onValueChange={days => 
                    setLocalSettings({
                      ...localSettings,
                      notifications: { ...localSettings.notifications, daysBeforeExpiry: parseInt(days) as 1 | 2 | 3 }
                    })
                  }
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    <SelectItem value="1">1 día antes</SelectItem>
                    <SelectItem value="2">2 días antes</SelectItem>
                    <SelectItem value="3">3 días antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hora */}
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
                <p className="text-xs text-muted-foreground">Formato: {formatTimeDisplay(localSettings.notifications.notificationTime)}</p>
              </div>

              {/* Configuración de Telegram */}
              {localSettings.notifications.channel === 'telegram' && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                    <p className="text-sm text-blue-200 mb-2"><strong>Configuración de Telegram</strong></p>
                    <p className="text-xs text-blue-200/80">Necesitas un bot de Telegram. <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">Crea uno aquí</a></p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Token del Bot</label>
                    <Input
                      type="password"
                      placeholder="123456:ABCDEFGHijklmnopqrstuvwxyz-1234567890"
                      className="glass-input"
                      value={localSettings.notifications.telegramBotToken || ''}
                      onChange={e => 
                        setLocalSettings({
                          ...localSettings,
                          notifications: { ...localSettings.notifications, telegramBotToken: e.target.value }
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Chat ID</label>
                    <Input
                      type="text"
                      placeholder="123456789 o -100123456789"
                      className="glass-input"
                      value={localSettings.notifications.telegramChatId || ''}
                      onChange={e => 
                        setLocalSettings({
                          ...localSettings,
                          notifications: { ...localSettings.notifications, telegramChatId: e.target.value }
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Inicia una conversación con tu bot y envía /start para obtener tu Chat ID</p>
                  </div>

                  <Button 
                    onClick={handleSendTestTelegram}
                    disabled={sendingTest}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                  >
                    <Send className="h-3 w-3 mr-2" />
                    {sendingTest ? 'Enviando...' : 'Enviar Notificación de Prueba'}
                  </Button>
                </div>
              )}

              {/* Configuración de WhatsApp */}
              {localSettings.notifications.channel === 'whatsapp' && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                    <p className="text-sm text-green-200 mb-2"><strong>Configuración de WhatsApp</strong></p>
                    <p className="text-xs text-green-200/80">Integración en desarrollo. Pronto podrás conectar WhatsApp Business API para notificaciones automáticas.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Número de WhatsApp</label>
                    <Input
                      type="tel"
                      placeholder="+34 123 45 67 89"
                      className="glass-input bg-white/5"
                      value={localSettings.notifications.whatsappPhoneNumber || ''}
                      onChange={e => 
                        setLocalSettings({
                          ...localSettings,
                          notifications: { ...localSettings.notifications, whatsappPhoneNumber: e.target.value }
                        })
                      }
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">Esta funcionalidad estará disponible próximamente</p>
                  </div>
                </div>
              )}

              <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
                <p className="text-sm text-primary">
                  📬 Recibirás notificaciones por <strong>{localSettings.notifications.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}</strong> {localSettings.notifications.daysBeforeExpiry} día{localSettings.notifications.daysBeforeExpiry > 1 ? 's' : ''} antes de vencimiento, a las <strong>{formatTimeDisplay(localSettings.notifications.notificationTime)}</strong>
                </p>
              </div>
            </>
          )}

          <Button 
            onClick={handleSaveNotifications}
            className="bg-primary hover:bg-primary/90 text-white w-full"
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
                <SelectItem value="GTQ">GTQ - Quetzales (Guatemala)</SelectItem>
                <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
                <SelectItem value="PEN">PEN - Sol (Perú)</SelectItem>
                <SelectItem value="BOB">BOB - Boliviano</SelectItem>
                <SelectItem value="VES">VES - Bolívar (Venezuela)</SelectItem>
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
            className="bg-primary hover:bg-primary/90 text-white w-full"
          >
            Guardar Preferencias
          </Button>
        </CardContent>
      </Card>

      {/* Información del Sistema */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Versión</p>
              <p className="text-sm text-white font-medium">2.0.0</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Última actualización</p>
              <p className="text-sm text-white font-medium">Hoy</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="text-sm text-emerald-400 font-medium">✅ En línea</p>
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
