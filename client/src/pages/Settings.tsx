import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bell, Settings as SettingsIcon, Zap, Send, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Settings() {
  const { settings, updateSettings, sendTelegramTestNotification } = useStreaming();
  const [localSettings, setLocalSettings] = useState<any>(settings);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (settings) {
      const normalized = {
        ...settings,
        defaultCurrency: 'USD',
        notificationsEnabled: !!settings.notificationsEnabled,
        notificationChannel: settings.notificationChannel || 'telegram',
        daysBeforeExpiry: settings.daysBeforeExpiry ?? 2,
        notificationTime: settings.notificationTime || '09:00',
        telegramBotToken: settings.telegramBotToken || '',
        telegramChatId: settings.telegramChatId || '',
        whatsappPhoneNumber: settings.whatsappPhoneNumber || '',

        telegramAccountTemplate: settings.telegramAccountTemplate || '',
        telegramProfileTemplate: settings.telegramProfileTemplate || '',
        saleMessageTemplate: settings.saleMessageTemplate || '',
      };
      setLocalSettings(normalized);
    }
  }, [settings]);

  const formatTimeDisplay = (time: string): string => {
    if (!time) return '09:00 AM';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  if (!localSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando configuración...</p>
      </div>
    );
  }

  const handleSaveNotifications = () => {
    if (localSettings.notificationsEnabled && localSettings.notificationChannel === 'telegram') {
      if (!localSettings.telegramBotToken || !localSettings.telegramChatId) {
        toast.error('Completa el token y chat ID de Telegram');
        return;
      }
    }

    updateSettings({
      notificationsEnabled: localSettings.notificationsEnabled,
      notificationChannel: localSettings.notificationChannel,
      daysBeforeExpiry: localSettings.daysBeforeExpiry,
      notificationTime: localSettings.notificationTime,
      telegramBotToken: localSettings.telegramBotToken || null,
      telegramChatId: localSettings.telegramChatId || null,
      whatsappPhoneNumber: localSettings.whatsappPhoneNumber || null,

      telegramAccountTemplate: localSettings.telegramAccountTemplate || null,
      telegramProfileTemplate: localSettings.telegramProfileTemplate || null,

      // también guardamos la plantilla de venta aquí (si ya está editada)
      saleMessageTemplate: localSettings.saleMessageTemplate || null,
    });

    toast.success('Configuración guardada');
  };

  const handleSaveSaleTemplate = () => {
    updateSettings({
      saleMessageTemplate: localSettings.saleMessageTemplate || null,
    });
    toast.success('Plantilla de venta guardada');
  };

  const handleSendTestTelegram = async () => {
    if (!localSettings.telegramBotToken || !localSettings.telegramChatId) {
      toast.error('Ingresa el token y chat ID de Telegram primero');
      return;
    }
    setSendingTest(true);
    await sendTelegramTestNotification(localSettings.telegramBotToken, localSettings.telegramChatId);
    setSendingTest(false);
  };

  const handleSaveCurrency = () => {
    updateSettings({ defaultCurrency: 'USD' });
    toast.success('Moneda configurada: USD');
  };

  const defaultAccountTpl = `⚠️ CUENTA MAESTRA por vencer ({{daysLeft}} día(s))
Servicio: {{serviceName}}
📧 Email: {{accountEmail}}
🔑 Pass: {{accountPassword}}
📅 Vence: {{accountEndDate}}

Acción: ¿Renovar o cancelar?`;

  const defaultProfileTpl = `⚠️ PERFIL por vencer ({{daysLeft}} día(s))
Servicio: {{serviceName}}
👤 Perfil: {{profileName}}
📞 Tel: {{phone}}
📅 Vence: {{profileEndDate}}

📩 MENSAJE PARA CLIENTE (copiar/pegar):
Hola 👋🏻
Tu servicio {{serviceName}} está por vencer el {{profileEndDate}}.

📧 Cuenta: {{accountEmail}}
🔑 Contraseña: {{accountPassword}}
👤 Perfil: {{profileName}}
🔢 PIN: {{pin}}

¿Deseas RENOVAR o ya NO usarás el servicio?
Cualquier inconveniente, contáctanos ✅`;

  const defaultSaleMessageTpl = `Hola 👋🏻

Aquí están tus datos de acceso:

Servicio: {{serviceName}}
📧 Correo: {{accountEmail}}
🔑 Contraseña: {{accountPassword}}
👤 Perfil: {{profileName}}
🔢 PIN: {{pin}}
📅 Caduca: {{endDate}}

Renovación: Renovar 1 o 2 días antes si gusta continuar con el servicio.

Cualquier inconveniente, no dudes en contactarnos ✅`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Configuración</h1>
        <p className="text-muted-foreground">Personaliza tu experiencia en la aplicación.</p>
      </div>

      {/* NOTIFICACIONES */}
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
                checked={!!localSettings.notificationsEnabled}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, notificationsEnabled: checked })}
                data-testid="switch-notifications"
              />
            </div>
          </div>

          {localSettings.notificationsEnabled && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Canal de notificación</label>
                <Select
                  value={localSettings.notificationChannel}
                  onValueChange={(channel) =>
                    setLocalSettings({ ...localSettings, notificationChannel: channel as 'whatsapp' | 'telegram' })
                  }
                >
                  <SelectTrigger className="glass-input" data-testid="select-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    <SelectItem value="telegram">📱 Telegram</SelectItem>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Avisar con anticipación</label>
                <Select
                  value={String(localSettings.daysBeforeExpiry ?? 2)}
                  onValueChange={(days) => setLocalSettings({ ...localSettings, daysBeforeExpiry: parseInt(days) })}
                >
                  <SelectTrigger className="glass-input" data-testid="select-days">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10 text-white">
                    <SelectItem value="1">1 día antes</SelectItem>
                    <SelectItem value="2">2 días antes</SelectItem>
                    <SelectItem value="3">3 días antes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Nota: El sistema también avisará <strong>el mismo día</strong> automáticamente.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Hora de notificación</label>
                <Input
                  type="time"
                  className="glass-input"
                  value={localSettings.notificationTime}
                  onChange={(e) => setLocalSettings({ ...localSettings, notificationTime: e.target.value })}
                  data-testid="input-notification-time"
                />
                <p className="text-xs text-muted-foreground">Formato: {formatTimeDisplay(localSettings.notificationTime)}</p>
              </div>

              {localSettings.notificationChannel === 'telegram' && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                    <p className="text-sm text-blue-200 mb-2">
                      <strong>Configuración de Telegram</strong>
                    </p>
                    <p className="text-xs text-blue-200/80">
                      Necesitas un bot de Telegram.{' '}
                      <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">
                        Crea uno aquí
                      </a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Token del Bot</label>
                    <Input
                      type="password"
                      placeholder="123456:ABCDEFGHijklmnopqrstuvwxyz-1234567890"
                      className="glass-input"
                      value={localSettings.telegramBotToken || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, telegramBotToken: e.target.value })}
                      data-testid="input-telegram-token"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Chat ID</label>
                    <Input
                      type="text"
                      placeholder="123456789 o -100123456789"
                      className="glass-input"
                      value={localSettings.telegramChatId || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, telegramChatId: e.target.value })}
                      data-testid="input-telegram-chatid"
                    />
                  </div>

                  <Button
                    onClick={handleSendTestTelegram}
                    disabled={sendingTest}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                    data-testid="button-test-telegram"
                  >
                    <Send className="h-3 w-3 mr-2" />
                    {sendingTest ? 'Enviando...' : 'Enviar Notificación de Prueba'}
                  </Button>

                  <div className="border-t border-white/10 pt-4 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">Plantilla Telegram (Cuenta maestra)</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/10 hover:bg-white/5 text-white h-8 text-xs"
                        onClick={() => setLocalSettings({ ...localSettings, telegramAccountTemplate: defaultAccountTpl })}
                      >
                        Usar base
                      </Button>
                    </div>

                    <textarea
                      className="glass-input w-full min-h-[150px] p-3 text-sm"
                      value={localSettings.telegramAccountTemplate || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, telegramAccountTemplate: e.target.value })}
                      placeholder={defaultAccountTpl}
                    />

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">Plantilla Telegram (Perfil)</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/10 hover:bg-white/5 text-white h-8 text-xs"
                        onClick={() => setLocalSettings({ ...localSettings, telegramProfileTemplate: defaultProfileTpl })}
                      >
                        Usar base
                      </Button>
                    </div>

                    <textarea
                      className="glass-input w-full min-h-[220px] p-3 text-sm"
                      value={localSettings.telegramProfileTemplate || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, telegramProfileTemplate: e.target.value })}
                      placeholder={defaultProfileTpl}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <Button
            onClick={handleSaveNotifications}
            className="bg-primary hover:bg-primary/90 text-white w-full"
            data-testid="button-save-notifications"
          >
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>

      {/* MENSAJE DE VENTA */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Mensaje de Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Plantilla para copiar/pegar al crear una venta</p>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white h-8 text-xs"
              onClick={() => setLocalSettings({ ...localSettings, saleMessageTemplate: defaultSaleMessageTpl })}
            >
              Usar base
            </Button>
          </div>

          <textarea
            className="glass-input w-full min-h-[220px] p-3 text-sm"
            value={localSettings.saleMessageTemplate || ''}
            onChange={(e) => setLocalSettings({ ...localSettings, saleMessageTemplate: e.target.value })}
            placeholder={defaultSaleMessageTpl}
          />

          <p className="text-xs text-muted-foreground">
            Variables:{' '}
            <code>{'{{serviceName}}'}</code>{' '}
            <code>{'{{accountEmail}}'}</code>{' '}
            <code>{'{{accountPassword}}'}</code>{' '}
            <code>{'{{profileName}}'}</code>{' '}
            <code>{'{{profileSlot}}'}</code>{' '}
            <code>{'{{pin}}'}</code>{' '}
            <code>{'{{endDate}}'}</code>{' '}
            <code>{'{{clientName}}'}</code>{' '}
            <code>{'{{clientPhone}}'}</code>{' '}
            <code>{'{{price}}'}</code>
          </p>

          <Button onClick={handleSaveSaleTemplate} className="bg-primary hover:bg-primary/90 text-white w-full">
            Guardar Plantilla
          </Button>
        </CardContent>
      </Card>

      {/* PREFERENCIAS GENERALES */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" /> Preferencias Generales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Moneda por defecto</label>
            <div className="glass-input flex items-center justify-between px-3 py-2">
              <span className="text-white font-medium">USD</span>
              <span className="text-xs text-muted-foreground">Fijo</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Actualmente el sistema trabaja solo en <strong>USD</strong>.
            </p>
          </div>

          <Button
            onClick={handleSaveCurrency}
            className="bg-primary hover:bg-primary/90 text-white w-full"
            data-testid="button-save-currency"
          >
            Guardar Preferencias
          </Button>
        </CardContent>
      </Card>

      {/* INFO DEL SISTEMA */}
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
              <p className="text-sm text-white font-medium" data-testid="text-version">
                2.0.0
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Última actualización</p>
              <p className="text-sm text-white font-medium">Hoy</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="text-sm text-emerald-400 font-medium" data-testid="text-status">
                ✅ En línea
              </p>
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
