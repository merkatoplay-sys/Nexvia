import { db } from "./db";
import { accounts, profiles, settings } from "@shared/schema";
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

    // 1) cuentas maestras por vencer
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, s.userId), eq(accounts.isArchived, false)));

    for (const a of userAccounts) {
      if (!a.expirationDate) continue;
      const left = daysLeftInTZ(new Date(a.expirationDate as any), TZ);
      if (!daysSet.has(left)) continue;

      const msg = renderTemplate(accountTpl, {
        daysLeft: left,
        serviceName: a.serviceName,
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
        serviceName: accounts.serviceName,
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

    for (const p of userProfiles) {
      if (!p.profileEndDate) continue;
      const left = daysLeftInTZ(new Date(p.profileEndDate as any), TZ);
      if (!daysSet.has(left)) continue;

      const msg = renderTemplate(profileTpl, {
        daysLeft: left,
        serviceName: p.serviceName,
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
