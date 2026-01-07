import { db } from "./db";
import { accounts, profiles, settings, services } from "@shared/schema";
import { and, eq, or, isNull } from "drizzle-orm";

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

function renderTemplate(tpl: string, data: Record<string, any>) {
  return (tpl || "").replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = data?.[key];
    return v === undefined || v === null ? "" : String(v);
  });
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

function buildServiceDisplay(baseServiceName: string, planName?: string | null) {
  const base = String(baseServiceName ?? "").trim();
  const plan = String(planName ?? "").trim();
  if (plan) return base ? `${base} - ${plan}` : plan;
  return base;
}

type RunOpts = {
  dryRun?: boolean; // ✅ no manda telegram, solo cuenta
};

export async function runExpiryNotifications(opts: RunOpts = {}) {
  const allSettings = await db.select().from(settings);

  let sent = 0;
  let scannedUsers = 0;

  // ✅ Debug counts
  let accountsCandidates = 0;
  let profilesCandidates = 0;
  let accountsMatched = 0;
  let profilesMatched = 0;

  for (const s of allSettings) {
    scannedUsers++;

    // Reglas de activación
    if (!s.notificationsEnabled) continue;
    if (s.notificationChannel !== "telegram") continue;
    if (!s.telegramBotToken || !s.telegramChatId) continue;

    const advance = Math.max(0, Math.min(3, Number(s.daysBeforeExpiry || 0)));

    // manda en 0..advance
    const daysSet = new Set<number>();
    for (let i = 0; i <= advance; i++) daysSet.add(i);

    const accountTpl = (s.telegramAccountTemplate || "").trim() || DEFAULT_ACCOUNT_TEMPLATE;
    const profileTpl = (s.telegramProfileTemplate || "").trim() || DEFAULT_PROFILE_TEMPLATE;

    // ✅ isArchived NULL debe contar como NO archivado
    const accountNotArchived = or(eq(accounts.isArchived, false), isNull(accounts.isArchived));

    // 1) cuentas maestras por vencer
    const userAccounts = await db
      .select({
        id: accounts.id,
        userId: accounts.userId,
        email: accounts.email,
        password: accounts.password,
        expirationDate: accounts.expirationDate,
        serviceNameLegacy: accounts.serviceName,
        planName: (accounts as any).planName,
        serviceNameCurrent: services.name,
      })
      .from(accounts)
      .leftJoin(services, eq(accounts.serviceId, services.id))
      .where(and(eq(accounts.userId, s.userId), accountNotArchived));

    accountsCandidates += userAccounts.length;

    for (const a of userAccounts) {
      if (!a.expirationDate) continue;

      const left = daysLeftInTZ(new Date(a.expirationDate as any), TZ);
      if (!daysSet.has(left)) continue;

      accountsMatched++;

      const baseServiceName = String(a.serviceNameCurrent || a.serviceNameLegacy || "").trim();
      const planName = String((a as any).planName ?? "").trim();
      const serviceDisplayName = buildServiceDisplay(baseServiceName, planName);

      const msg = renderTemplate(accountTpl, {
        daysLeft: left,
        serviceName: serviceDisplayName,
        serviceDisplayName,
        baseServiceName,
        planName,

        accountEmail: a.email,
        accountPassword: a.password || "",
        accountEndDate: formatDateGT(new Date(a.expirationDate as any), TZ),
      });

      if (!opts.dryRun) {
        await sendTelegram(s.telegramBotToken, s.telegramChatId, msg);
        sent++;
      }
    }

    // 2) perfiles por vencer
    const userProfiles = await db
      .select({
        profileId: profiles.id,
        profileName: profiles.name,
        phone: profiles.phone,
        pin: profiles.pin,
        profileEndDate: profiles.endDate,

        accountEmail: accounts.email,
        accountPassword: accounts.password,
        serviceNameLegacy: accounts.serviceName,
        planName: (accounts as any).planName,
        serviceNameCurrent: services.name,
      })
      .from(profiles)
      .innerJoin(accounts, eq(profiles.accountId, accounts.id))
      .leftJoin(services, eq(accounts.serviceId, services.id))
      .where(
        and(
          eq(profiles.userId, s.userId),
          eq(profiles.status, "activo"),
          accountNotArchived
        )
      );

    profilesCandidates += userProfiles.length;

    for (const p of userProfiles) {
      if (!p.profileEndDate) continue;

      const left = daysLeftInTZ(new Date(p.profileEndDate as any), TZ);
      if (!daysSet.has(left)) continue;

      profilesMatched++;

      const baseServiceName = String(p.serviceNameCurrent || p.serviceNameLegacy || "").trim();
      const planName = String((p as any).planName ?? "").trim();
      const serviceDisplayName = buildServiceDisplay(baseServiceName, planName);

      const msg = renderTemplate(profileTpl, {
        daysLeft: left,
        serviceName: serviceDisplayName,
        serviceDisplayName,
        baseServiceName,
        planName,

        accountEmail: p.accountEmail,
        accountPassword: p.accountPassword || "",
        profileName: p.profileName,
        pin: p.pin || "",
        phone: p.phone || "",
        profileEndDate: formatDateGT(new Date(p.profileEndDate as any), TZ),
      });

      if (!opts.dryRun) {
        await sendTelegram(s.telegramBotToken, s.telegramChatId, msg);
        sent++;
      }
    }
  }

  return {
    scannedUsers,
    sent,
    accountsCandidates,
    profilesCandidates,
    accountsMatched,
    profilesMatched,
    dryRun: !!opts.dryRun,
  };
}
