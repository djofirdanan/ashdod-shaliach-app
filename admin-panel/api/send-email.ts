import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

// SMTP config for ashdodindex.co.il
const transporter = nodemailer.createTransport({
  host: 'mail.ashdodindex.co.il',
  port: 465,
  secure: true, // SSL
  auth: {
    user: 'delivers@ashdodindex.co.il',
    pass: '339529Aa!@',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
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

  try {
    const info = await transporter.sendMail({
      from: '"אשדוד-שליח" <delivers@ashdodindex.co.il>',
      to,
      subject,
      html: html || text || '',
      text: text || '',
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({
      error: 'Failed to send email',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
