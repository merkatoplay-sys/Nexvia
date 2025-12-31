import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bell, Settings as SettingsIcon, Zap, Send, MessageSquare, Copy } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const LS_SALE_TEMPLATE = 'sale_message_template_v1';

const DEFAULT_SALE_TEMPLATE = `Hola 👋🏻
Aquí están tus datos:

📌 Servicio: {{serviceName}}
📧 Cuenta: {{accountEmail}}
🔑 Contraseña: {{accountPassword}}
👤 Perfil: {{profileName}}
🔢 PIN: {{pin}}
📅 Vence: {{endDate}}

Te avisaremos 1–2 días antes de tu renovación ✅
Cualquier inconveniente, no dudes en contactarnos.`;

function renderTemplate(tpl: string, data: Record<string, any>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = data?.[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

export default function Settings() {
  const { settings, updateSettings, sendTelegramTestNotification } = useStreaming();
  const [localSettings, setLocalSettings] = useState(settings);
  const [sendingTest, setSendingTest] = useState(false);

  // ✅ plantilla mensaje cliente (localStorage por ahora)
  const [saleTemplate, setSaleTemplate] = useState<string>(DEFAULT_SALE_TEMPLATE);

  useEffect(() => {
    // cargar plantilla guardada
    try {
      const saved = localStorage.getItem(LS_SALE_TEMPLATE);
      if (saved && saved.trim()) setSaleTemplate(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (settings) {
      // ✅ Forzar USD en UI para evitar confusión si existía otra moneda guardada
      const normalized = {
        ...settings,
        defaultCurrency: 'USD',
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

  const previewMessage = useMemo(() => {
    return renderTemplate(saleTemplate, {
      serviceName: 'Netflix',
      accountEmail: 'correo@ejemplo.com',
      accountPassword: 'clave123',
      profileName: 'Perfil 1',
      pin: '1234',
      endDate: '2026-01-15',
    });
  }, [saleTemplate]);

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
      telegramBotToken: localSettings.telegramBotToken,
      telegramChatId: localSettings.telegramChatId,
      whatsappPhoneNumber: localSettings.whatsappPhoneNumber,
    });
    toast.success('Notificaciones configuradas');
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

  // ✅ Moneda fija: USD
  const handleSaveCurrency = () => {
    updateSettings({ defaultCurrency: 'USD' });
    toast.success('Moneda configurada: USD');
  };

  const handleSaveSaleTemplate = () => {
    try {
      localStorage.setItem(LS_SALE_TEMPLATE, saleTemplate);
      toast.success('Plantilla guardada');
    } catch {
      toast.error('No se pudo guardar la plantilla');
    }
  };

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewMessage);
      toast.success('Copiado ✅');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Configuración</h1>
        <p className="text-muted-foreground">Personaliza tu experiencia en la aplicación.</p>
      </div>

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
                checked={localSettings.notificationsEnabled}
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
                  value={localSettings.daysBeforeExpiry.toString()}
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
                  (Y también enviaremos aviso <strong>el mismo día</strong> del vencimiento)
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
                    <p className="text-xs text-muted-foreground">Inicia chat con tu bot y envía /start</p>
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
                </div>
              )}

              <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
                <p className="text-sm text-primary">
                  📬 Recibirás notificaciones por{' '}
                  <strong>{localSettings.notificationChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}</strong> {localSettings.daysBeforeExpiry}{' '}
                  día{localSettings.daysBeforeExpiry > 1 ? 's' : ''} antes de vencimiento, a las{' '}
                  <strong>{formatTimeDisplay(localSettings.notificationTime)}</strong> (y también el mismo día).
                </p>
              </div>
            </>
          )}

          <Button
            onClick={handleSaveNotifications}
            className="bg-primary hover:bg-primary/90 text-white w-full"
            data-testid="button-save-notifications"
          >
            Guardar Configuración de Notificaciones
          </Button>
        </CardContent>
      </Card>

      {/* ✅ NUEVO: Mensajes para clientes */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Mensaje para enviar al cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Variables disponibles:</p>
            <p className="text-xs text-muted-foreground">
              <code>{{`{{serviceName}}`}}</code>, <code>{{`{{accountEmail}}`}}</code>, <code>{{`{{accountPassword}}`}}</code>,{' '}
              <code>{{`{{profileName}}`}}</code>, <code>{{`{{pin}}`}}</code>, <code>{{`{{endDate}}`}}</code>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Plantilla</label>
            <textarea
              className="glass-input w-full min-h-[180px] p-3 text-sm"
              value={saleTemplate}
              onChange={(e) => setSaleTemplate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-white">Vista previa</label>
              <Button type="button" variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={handleCopyPreview}>
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
            </div>

            <pre className="whitespace-pre-wrap text-xs bg-black/30 border border-white/10 rounded-lg p-3 text-muted-foreground">
              {previewMessage}
            </pre>
          </div>

          <Button onClick={handleSaveSaleTemplate} className="bg-primary hover:bg-primary/90 text-white w-full">
            Guardar plantilla
          </Button>
        </CardContent>
      </Card>

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
              Actualmente el sistema trabaja solo en <strong>USD</strong> para evitar confusión.
            </p>
          </div>

          <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
            <p className="text-sm text-primary">
              Moneda seleccionada: <strong>USD</strong>
            </p>
          </div>

          <Button onClick={handleSaveCurrency} className="bg-primary hover:bg-primary/90 text-white w-full" data-testid="button-save-currency">
            Guardar Preferencias
          </Button>
        </CardContent>
      </Card>

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
