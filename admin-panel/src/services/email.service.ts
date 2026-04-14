// Email service — calls our Vercel serverless SMTP endpoint

const API_URL = '/api/send-email';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('[email.service] Failed to send email:', err);
    return false;
  }
}

// ─── Email templates ─────────────────────────────────────────────────────────

export async function sendWelcomeBusiness(to: string, businessName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: `ברוכים הבאים ל-אשדוד-שליח, ${businessName}!`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f9fc; padding: 24px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #533afd, #ea2261); border-radius: 12px; padding: 12px 20px;">
            <span style="color: white; font-size: 18px; font-weight: 900;">🚀 אשדוד-שליח</span>
          </div>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <h1 style="color: #061b31; font-size: 22px; margin-bottom: 8px;">ברוכים הבאים, ${businessName}! 🎉</h1>
          <p style="color: #6b7c93; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            ההרשמה שלכם התקבלה בהצלחה! הצוות שלנו יבדוק את הפרטים ויאשר את החשבון בקרוב.
          </p>
          <div style="background: #f6f9fc; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-right: 4px solid #533afd;">
            <p style="color: #3c4257; font-size: 14px; margin: 0;">⏳ <strong>זמן אישור:</strong> עד 24 שעות בימי עסקים</p>
          </div>
          <p style="color: #6b7c93; font-size: 14px;">לשאלות: <a href="mailto:delivers@ashdodindex.co.il" style="color: #533afd;">delivers@ashdodindex.co.il</a></p>
        </div>
        <p style="text-align: center; color: #c1cdd8; font-size: 12px; margin-top: 16px;">© ${new Date().getFullYear()} אשדוד-שליח. כל הזכויות שמורות.</p>
      </div>
    `,
  });
}

export async function sendWelcomeCourier(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: `ברוך הבא לצוות אשדוד-שליח, ${name}!`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f9fc; padding: 24px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #533afd, #ea2261); border-radius: 12px; padding: 12px 20px;">
            <span style="color: white; font-size: 18px; font-weight: 900;">🛵 אשדוד-שליח</span>
          </div>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <h1 style="color: #061b31; font-size: 22px; margin-bottom: 8px;">ברוך הבא לצוות, ${name}! 🎉</h1>
          <p style="color: #6b7c93; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            נרשמת בהצלחה כשליח ב-אשדוד-שליח. הצוות שלנו יבדוק את הפרטים ויאשר את חשבונך בקרוב.
          </p>
          <div style="background: #f6f9fc; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-right: 4px solid #00b090;">
            <p style="color: #3c4257; font-size: 14px; margin: 0; line-height: 1.8;">
              ✅ <strong>מה הלאה?</strong><br/>
              1. אישור החשבון תוך 24 שעות<br/>
              2. קבלת גישה לאפליקציית השליח<br/>
              3. קבלת משלוח ראשון!
            </p>
          </div>
          <p style="color: #6b7c93; font-size: 14px;">לשאלות: <a href="mailto:delivers@ashdodindex.co.il" style="color: #533afd;">delivers@ashdodindex.co.il</a></p>
        </div>
        <p style="text-align: center; color: #c1cdd8; font-size: 12px; margin-top: 16px;">© ${new Date().getFullYear()} אשדוד-שליח. כל הזכויות שמורות.</p>
      </div>
    `,
  });
}

export async function sendAccountApproved(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: '✅ החשבון שלך אושר — אשדוד-שליח',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f9fc; padding: 24px; border-radius: 12px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <h1 style="color: #061b31; font-size: 22px; margin-bottom: 8px;">✅ החשבון שלך אושר!</h1>
          <p style="color: #6b7c93; font-size: 15px; line-height: 1.6;">
            שלום ${name}, החשבון שלך ב-אשדוד-שליח אושר ופעיל כעת. כנס עם המייל והסיסמה שלך:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://admin-panel-sigma-ruby.vercel.app/login" style="display: inline-block; background: linear-gradient(135deg, #533afd, #3d22e0); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 15px;">
              כניסה למערכת ←
            </a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendNewDeliveryNotification(
  to: string,
  courierName: string,
  businessName: string,
  address: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `📦 משלוח חדש מ-${businessName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f9fc; padding: 24px; border-radius: 12px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <h1 style="color: #061b31; font-size: 20px; margin-bottom: 8px;">📦 משלוח חדש!</h1>
          <p style="color: #6b7c93;">שלום ${courierName}, קיבלת משלוח חדש:</p>
          <div style="background: #f6f9fc; border-radius: 8px; padding: 16px; margin: 16px 0; border-right: 4px solid #533afd;">
            <p style="color: #3c4257; margin: 0; line-height: 1.8; font-size: 14px;">
              🏪 <strong>עסק:</strong> ${businessName}<br/>
              📍 <strong>כתובת מסירה:</strong> ${address}
            </p>
          </div>
          <p style="color: #8898aa; font-size: 13px;">כנס לאפליקציה לפרטים מלאים.</p>
        </div>
      </div>
    `,
  });
}
