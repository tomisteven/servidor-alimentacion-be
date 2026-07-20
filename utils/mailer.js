import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const MEAL_LABELS = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
};

export async function sendMealNotification({ to, recipeName, mealType, date, assignedByName, houseName }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('SMTP no configurado, email no enviado');
    return;
  }

  const mealLabel = MEAL_LABELS[mealType] || mealType;
  const dateObj = new Date(date + 'T12:00:00');
  const dateStr = dateObj.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  try {
    await transporter.sendMail({
      from: `"Plan Alimentación" <${process.env.SMTP_USER}>`,
      to,
      subject: `🍽️ Nueva comida asignada: ${recipeName}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669, #34D399); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 8px;">🍽️</div>
            <h1 style="color: white; font-size: 20px; margin: 0;">Nueva comida asignada</h1>
          </div>
          <div style="background: #FFFFFF; padding: 24px; border-radius: 0 0 16px 16px; border: 1px solid #E2E8F0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
              <strong>${assignedByName || 'Alguien'}</strong> asignó una comida en
              ${houseName ? `<strong>${houseName}</strong>` : 'tu casa'}:
            </p>
            <div style="background: #F0FDF4; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
              <div style="color: #059669; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ${mealLabel}
              </div>
              <div style="color: #0F172A; font-size: 18px; font-weight: 700;">
                ${recipeName}
              </div>
              <div style="color: #64748B; font-size: 13px; margin-top: 4px;">
                📅 ${dateStr}
              </div>
            </div>
            <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 0;">
              Plan Alimentación · Comé mejor, viví mejor
            </p>
          </div>
        </div>
      `,
    });
    console.log(`Email enviado a ${to}`);
  } catch (err) {
    console.error(`Error enviando email a ${to}:`, err.message);
  }
}
