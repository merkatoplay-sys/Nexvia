import { db } from "./db";
import { accounts, profiles, settings, services } from "@shared/schema";
import { and, eq } from "drizzle-orm";

const TZ = "America/Guatemala";

const DEFAULT_ACCOUNT_TEMPLATE =
`⚠️ CUENTA MAESTRA por vencer ({{daysLeft}} día(s))
Servicio: {{serviceName}}
📧 Email: {{accountEmail}}
🔑 Pass: {{accountPassword}}
📅 Vence: {{accountEndDate}}

Acción: ¿Renovar o cancelar?`;

const DEFAULT_PROFILE_TEMPLATE =
`⚠️ PERFIL por vencer ({{daysLeft}} día(s))
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

/** Template renderer tolerante */
function renderTemplate(tpl: string, data: Record<string, any>) {
  return (tpl || "").replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = data?.[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Normalizador para matching tolerante de nombres */
function norm(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function buildServiceDisplayName(baseServiceName: string, planName?: string | null) {
  const s = String(baseServiceName ?? "").trim();
  const p = String(planName ?? "").trim();
  if (!p) return s || "";
  if (norm(p).includes(norm(s)) || norm(s).includes(norm(p))) return p;
  return `${s} - ${p}`;
}

function ymdInTZ(d: Date, tz = TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function daysLeftInTZ(target: Date, tz = TZ) {
  const today = ymdInTZ(new Date(), tz);
  const exp = ymdInTZ(target, tz);
  const a = Date.parse(today + "T00:00:00Z");
  const b = Date.parse(exp + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

function formatDateGT(d: Date, tz = TZ) {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

async function sendTelegram(botToken: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram error: ${res.status} ${body}`);
  }
}

/** Busca servicio por ID primero, luego fallback tolerante por nombre */
function findServiceForAccount(
  acc: any,
  servicesById: Map<string, any>,
  servicesList: any[]
) {
  const sid = String(acc?.serviceId ?? "").trim();
  if (sid && servicesById.has(sid)) return servicesById.get(sid);

  const accName = String(acc?.serviceName ?? "").trim();
  if (!accName) return null;

  const aN = norm(accName);

  // exact normalizado
  const exact = servicesList.find((s: any) => norm(s?.name) === aN);
  if (exact) return exact;

  // includes tolerante (HBO vs HBO MAX)
  const candidates = servicesList
    .filter((s: any) => {
      const sn = norm(s?.name);
      return sn && (sn.includes(aN) || aN.includes(sn));
    })
    .map((s: any) => ({ s, score: Math.min(norm(s?.name).length, aN.length) }))
    .sort((a: any, b: any) => b.score - a.score);

  return candidates[0]?.s ?? null;
}

export async function runExpiryNotifications() {
  const allSettings = await db.select().from(settings);

  let sent = 0;
  let scannedUsers = 0;

  for (const s of allSettings) {
    scannedUsers++;

    if (!s.notificationsEnabled) continue;
    if (s.notificationChannel !== "telegram") continue;
    if (!s.telegramBotToken || !s.telegramChatId) continue;

    const advance = Math.max(0, Math.min(3, Number(s.daysBeforeExpiry || 0)));

    // ✅ siempre manda el mismo día (0)
    const daysSet = new Set<number>([0, advance]);

    // ✅ si eliges 2, también manda 1
    if (advance >= 2) daysSet.add(1);

    // ✅ si eliges 3, también manda 2 y 1
    if (advance >= 3) {
      daysSet.add(2);
      daysSet.add(1);
    }

    const accountTpl = (s.telegramAccountTemplate || "").trim() || DEFAULT_ACCOUNT_TEMPLATE;
    const profileTpl = (s.telegramProfileTemplate || "").trim() || DEFAULT_PROFILE_TEMPLATE;

    // ✅ cargar servicios del usuario (para reflejar nombres actualizados)
    const userServices = await db
      .select()
      // usamos (services as any).userId por si el tipo no expone userId directamente
      .from(services)
      .where(eq((services as any).userId, s.userId));

    const servicesById = new Map<string, any>();
    for (const sv of userServices as any[]) {
      if (sv?.id) servicesById.set(String(sv.id), sv);
    }

    // 1) cuentas maestras por vencer
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, s.userId), eq(accounts.isArchived, false)));

    for (const a of userAccounts as any[]) {
      if (!a.expirationDate) continue;

      const left = daysLeftInTZ(new Date(a.expirationDate as any), TZ);
      if (!daysSet.has(left)) continue;

      const svc = findServiceForAccount(a, servicesById, userServices as any[]);
      const baseServiceName = String(svc?.name ?? a.serviceName ?? "").trim();
      const planName = String(a?.planName ?? "").trim();
      const serviceDisplayName = buildServiceDisplayName(baseServiceName, planName);

      // 🔥 clave: serviceName ahora incluye el plan si existe (sin tocar plantillas)
      const msg = renderTemplate(accountTpl, {
        daysLeft: left,
        serviceName: serviceDisplayName,

        // extras opcionales
        baseServiceName,
        planName,
        serviceDisplayName,

        accountEmail: a.email,
        accountPassword: a.password || "",
        accountEndDate: formatDateGT(new Date(a.expirationDate as any), TZ),
      });

      await sendTelegram(s.telegramBotToken, s.telegramChatId, msg);
      sent++;
    }

    // 2) perfiles por vencer (con datos de la cuenta)
    const userProfiles = await db
      .select({
        profileId: profiles.id,
        profileName: profiles.name,
        phone: profiles.phone,
        pin: profiles.pin,
        profileEndDate: profiles.endDate,

        accountEmail: accounts.email,
        accountPassword: accounts.password,

        // ✅ traer datos para resolver servicio/plan
        accountServiceId: (accounts as any).serviceId,
        accountServiceName: accounts.serviceName,
        accountPlanName: (accounts as any).planName,
      })
      .from(profiles)
      .innerJoin(accounts, eq(profiles.accountId, accounts.id))
      .where(
        and(
          eq(profiles.userId, s.userId),
          eq(profiles.status, "activo"),
          eq(accounts.isArchived, false)
        )
      );

    for (const p of userProfiles as any[]) {
      if (!p.profileEndDate) continue;

      const left = daysLeftInTZ(new Date(p.profileEndDate as any), TZ);
      if (!daysSet.has(left)) continue;

      // armamos un objeto "account-like" para reutilizar resolver
      const accLike = {
        serviceId: p.accountServiceId,
        serviceName: p.accountServiceName,
        planName: p.accountPlanName,
      };

      const svc = findServiceForAccount(accLike, servicesById, userServices as any[]);
      const baseServiceName = String(svc?.name ?? p.accountServiceName ?? "").trim();
      const planName = String(p.accountPlanName ?? "").trim();
      const serviceDisplayName = buildServiceDisplayName(baseServiceName, planName);

      const msg = renderTemplate(profileTpl, {
        daysLeft: left,
        serviceName: serviceDisplayName,

        // extras opcionales
        baseServiceName,
        planName,
        serviceDisplayName,

        accountEmail: p.accountEmail,
        accountPassword: p.accountPassword || "",
        profileName: p.profileName,
        pin: p.pin || "",
        phone: p.phone || "",
        profileEndDate: formatDateGT(new Date(p.profileEndDate as any), TZ),
      });

      await sendTelegram(s.telegramBotToken, s.telegramChatId, msg);
      sent++;
    }
  }

  return { scannedUsers, sent };
}
