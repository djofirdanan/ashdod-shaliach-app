/**
 * /api/send-email — Vercel serverless email handler
 *
 * Primary:  Resend HTTP API (set RESEND_API_KEY env var in Vercel dashboard)
 *           → always works on Vercel, never blocked
 * Fallback: nodemailer SMTP (port 587 → port 465)
 *           → works in local dev; Vercel blocks SMTP outbound so this is dev-only
 *
 * GET  /api/send-email  → health check (shows current config, no auth needed)
 * POST /api/send-email  → send email  { to, subject, html?, text? }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

// ── Config (prefer env vars; fall back to literal values) ──────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

const SMTP_HOST = process.env.SMTP_HOST || 'mail.ashdodindex.co.il';
const SMTP_USER = process.env.SMTP_USER || 'delivers@ashdodindex.co.il';
const SMTP_PASS = process.env.SMTP_PASS || '339529Aa!@';
const FROM_NAME = 'אשדוד-שליח 🚀';
const FROM_ADDR = SMTP_USER;

// ── Resend via HTTPS (works on Vercel) ─────────────────────────────────────────
async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_ADDR}>`,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${JSON.stringify(data)}`);
  }

  return { provider: 'resend', messageId: data.id as string };
}

// ── nodemailer SMTP (local dev / non-Vercel) ───────────────────────────────────
async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
  text: string,
  port: 587 | 465,
) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,          // true = SSL (465),  false = STARTTLS (587)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10_000,
    greetingTimeout:    5_000,
    socketTimeout:     10_000,
  });

  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDR}>`,
    to,
    subject,
    html,
    text,
  });

  return { provider: `smtp:${port}`, messageId: info.messageId };
}

// ── Handler ────────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: health check ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      config: {
        resendConfigured: !!RESEND_API_KEY,
        smtpHost: SMTP_HOST,
        smtpUser: SMTP_USER,
        smtpPassSet: !!SMTP_PASS,
      },
      recommendation: RESEND_API_KEY
        ? 'Resend is configured ✅ — emails will work on Vercel'
        : '⚠️  RESEND_API_KEY not set — emails will fail on Vercel (SMTP is blocked). Add RESEND_API_KEY in Vercel dashboard.',
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, subject, html, text } = req.body as {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  };

  if (!to || !subject) {
    return res.status(400).json({ error: 'Missing required fields: to, subject' });
  }

  const htmlBody = html || `<p>${text ?? ''}</p>`;
  const textBody = text ?? '';

  const errors: string[] = [];

  // 1️⃣  Try Resend (always works on Vercel)
  if (RESEND_API_KEY) {
    try {
      const result = await sendViaResend(to, subject, htmlBody, textBody);
      console.log(`[email] ✅ sent via ${result.provider}:`, result.messageId, '→', to);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[email] Resend failed:', msg);
      errors.push(`resend: ${msg}`);
    }
  }

  // 2️⃣  Try SMTP port 587 (STARTTLS — sometimes works in non-Vercel envs)
  try {
    const result = await sendViaSmtp(to, subject, htmlBody, textBody, 587);
    console.log(`[email] ✅ sent via ${result.provider}:`, result.messageId, '→', to);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email] SMTP 587 failed:', msg);
    errors.push(`smtp:587: ${msg}`);
  }

  // 3️⃣  Try SMTP port 465 (SSL — legacy fallback)
  try {
    const result = await sendViaSmtp(to, subject, htmlBody, textBody, 465);
    console.log(`[email] ✅ sent via ${result.provider}:`, result.messageId, '→', to);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email] SMTP 465 failed:', msg);
    errors.push(`smtp:465: ${msg}`);
  }

  // All methods failed
  console.error('[email] ❌ all methods failed for', to, errors);
  return res.status(500).json({
    error: 'Failed to send email — all delivery methods exhausted',
    errors,
    fix: 'Add RESEND_API_KEY environment variable in Vercel Project Settings → Environment Variables',
  });
}
