import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  NODE_ENV,
} = process.env;

// Simple in-memory dedupe cache to avoid duplicate sends (short-lived, process memory)
const recentSends = new Map();
const DEDUPE_TTL_MS = 1000 * 30; // 30 seconds

function dedupeKey(type, targetEmail, eventId) {
  return `${type}:${targetEmail}:${eventId || "none"}`;
}

function shouldSend(key) {
  const now = Date.now();
  const last = recentSends.get(key);
  if (last && now - last < DEDUPE_TTL_MS) return false;
  recentSends.set(key, now);
  // prunes old entries lazily
  if (recentSends.size > 1000) {
    for (const [k, v] of recentSends) {
      if (now - v > DEDUPE_TTL_MS) recentSends.delete(k);
    }
  }
  return true;
}

function loadTemplate(name) {
  try {
    const html = fs.readFileSync(path.join(__dirname, "..", "templates", `${name}.html`), "utf8");
    const text = fs.readFileSync(path.join(__dirname, "..", "templates", `${name}.txt`), "utf8");
    return { html, text };
  } catch (err) {
    return { html: null, text: null };
  }
}

function interpolate(template, vars = {}) {
  if (!template) return null;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else if (NODE_ENV !== "production") {
  // in dev, allow sending via Ethereal if not configured
  (async () => {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    // eslint-disable-next-line no-console
    console.log("Ethereal SMTP configured for dev. View messages at:", nodemailer.getTestMessageUrl);
  })();
}

async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    // transporter not configured; log and return resolved promise
    // eslint-disable-next-line no-console
    console.warn("Email transporter not configured. Skipping send to:", to);
    return Promise.resolve({ skipped: true });
  }

  const msg = {
    from: EMAIL_FROM || `SkillBridge <no-reply@skillbridge.local>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(msg);
    return { info };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error sending email:", err);
    throw err;
  }
}

async function sendTemplate(type, { to, eventId, vars = {}, subject }) {
  const key = dedupeKey(type, to, eventId);
  if (!shouldSend(key)) return { dedupped: true };

  const tpl = loadTemplate(type);
  const html = interpolate(tpl.html, vars);
  const text = interpolate(tpl.text, vars) || html?.replace(/<[^>]+>/g, "") || "";

  // fire-and-forget style: callers can await, but endpoint will not block
  return sendMail({ to, subject: subject || vars.subject || "SkillBridge Notification", html, text });
}

export default {
  sendTemplate,
};
