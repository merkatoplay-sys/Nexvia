// Sales.tsx
import { useStreaming } from '@/context/StreamingContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ShoppingCart, MessageSquare, Copy } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { format, addDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type SaleMode = 'perfil' | 'cuenta';

const DEFAULT_SALE_MESSAGE_TPL = `Hola 👋🏻

Aquí están tus datos de acceso:

Servicio: {{serviceName}}
📧 Correo: {{accountEmail}}
🔑 Contraseña: {{accountPassword}}
👤 Perfil: {{profileName}}
🔢 PIN: {{pin}}
📅 Caduca: {{endDate}}

Renovación: Renovar 1 o 2 días antes si gusta continuar con el servicio.

Cualquier inconveniente, no dudes en contactarnos ✅`;

const formatSpanishLongDate = (isoOrDate: string | Date | null | undefined) => {
  if (!isoOrDate) return '';
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return '';
    return format(d, "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return '';
  }
};

const applyTemplate = (tpl: string, vars: Record<string, string>) => {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? '');
};

const norm = (v: any) => String(v ?? '').trim().toLowerCase();

const sortProfilesStable = (profiles: any[]) => {
  const arr = Array.isArray(profiles) ? [...profiles] : [];
  return arr.sort((a: any, b: any) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
};

export default function Sales() {
  const { accounts, services, sellProfile, sellAccount, clients, settings } = useStreaming();
  const [location] = useLocation();

  const accountsSafe = accounts ?? [];
  const servicesSafe = services ?? [];
  const clientsSafe = clients ?? [];

  const getServiceById = (id?: string) => (id ? servicesSafe.find((s: any) => s.id === id) ?? null : null);

  const getServiceByNameCI = (name?: string) => {
    if (!name) return null;
    const n = norm(name);
    return servicesSafe.find((s: any) => norm(s?.name) === n) ?? null;
  };

  const getServiceForAccount = (acc: any) => {
    if (!acc) return null;
    const byId = acc.serviceId ? getServiceById(acc.serviceId) : null;
    if (byId) return byId;
    if (acc.serviceName) return getServiceByNameCI(acc.serviceName);
    return null;
  };

  const getBaseServiceNameForAccount = (acc: any) => {
    const svc = getServiceForAccount(acc);
    return (svc?.name ?? acc?.serviceName ?? '').trim();
  };

  const getServiceDisplayNameForAccount = (acc: any) => {
    const base = getBaseServiceNameForAccount(acc);
    const plan = String(acc?.planName ?? '').trim();
    if (plan) return base ? `${base} - ${plan}` : plan;
    return base;
  };

  const [saleMode, setSaleMode] = useState<SaleMode>('perfil');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);

  const [saleData, setSaleData] = useState({
    name: '',
    phone: '',
    pin: '',
    price: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });

  const selectedAccount = useMemo(
    () => accountsSafe.find((a: any) => a.id === selectedAccountId),
    [accountsSafe, selectedAccountId]
  );

  // 🔥 FIX PRINCIPAL AQUÍ
  const selectedAccountProfiles = useMemo(() => {
    return sortProfilesStable((selectedAccount?.profiles ?? []) as any[]);
  }, [selectedAccount]);

  const totalSlots = Number(selectedAccount?.totalProfiles || 0);

  const displayProfiles = useMemo(() => {
    return Array.from({ length: totalSlots }, (_, idx) => {
      const p = selectedAccountProfiles[idx];
      return (
        p ?? {
          id: `virtual-${selectedAccount?.id}-${idx}`,
          name: `Perfil ${idx + 1}`,
          status: 'disponible',
          __virtual: true,
        }
      );
    });
  }, [selectedAccountProfiles, totalSlots, selectedAccount]);

  const availableProfiles = displayProfiles.filter((p: any) => p.status === 'disponible');

  const handleConfirm = async () => {
    if (!selectedProfileId) return;

    await sellProfile(selectedAccountId, selectedProfileId, {
      name: saleData.name,
      phone: saleData.phone,
      pin: saleData.pin,
      price: Number(saleData.price),
      startDate: saleData.startDate + 'T00:00:00Z',
      endDate: saleData.endDate + 'T00:00:00Z',
    });

    setIsSellDialogOpen(false);
  };

  return (
    <div>
      <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un perfil" />
        </SelectTrigger>
        <SelectContent>
          {availableProfiles.map((p: any) => {
            const realProfile = p.__virtual
              ? selectedAccountProfiles.find((rp: any) => rp.status === 'disponible')
              : p;

            return (
              <SelectItem key={p.id} value={realProfile?.id || ''}>
                {p.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}