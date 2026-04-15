import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
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

  // Create transporter fresh per request (avoid connection timeout issues)
  const transporter = nodemailer.createTransport({
    host: 'mail.ashdodindex.co.il',
    port: 465,
    secure: true,
    auth: {
      user: 'delivers@ashdodindex.co.il',
      pass: '339529Aa!@',
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 8000,
    socketTimeout: 8000,
  });

  try {
    const info = await transporter.sendMail({
      from: '"אשדוד-שליח 🚀" <delivers@ashdodindex.co.il>',
      to,
      subject,
      html: html || `<p>${text || ''}</p>`,
      text: text || '',
    });

    console.log('[email] sent:', info.messageId, '→', to);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('[email] error:', err);
    return res.status(500).json({
      error: 'Failed to send email',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
