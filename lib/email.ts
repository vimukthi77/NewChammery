import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER || 'newchammery@gmail.com';
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD || 'ibvghpwabpsjzgnw';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Chammery';
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_APP_PASSWORD,
  },
});

export async function sendWelcomeEmail({
  to,
  name,
  password,
}: {
  to: string;
  name: string;
  password: string;
}) {
  const loginUrl = `${NEXTAUTH_URL}/login`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Chammery</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF8F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1A2E;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFF8F0; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #F5E6D3;" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #E67E22, #8B4513); padding: 36px 30px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background-color: #FFFFFF; border-radius: 16px; font-size: 28px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                🍽️
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Chammery</h1>
              <p style="margin: 6px 0 0 0; color: #FFDAB9; font-size: 14px; font-weight: 500;">Corporate & Institutional Meal Management</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 14px 0; color: #1A1A2E; font-size: 20px; font-weight: 700;">Hello ${name}, welcome! 👋</h2>
              <p style="margin: 0 0 24px 0; color: #555566; font-size: 15px; line-height: 1.6;">
                Your account on <strong>Chammery</strong> has been successfully created. You can now request your daily meals (Breakfast, Lunch & Dinner) and track your points with ease.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #FFF8F0; border: 1.5px dashed #E67E22; border-radius: 16px; padding: 22px; margin-bottom: 26px;">
                <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #8B4513; letter-spacing: 0.5px;">Your Login Credentials</p>
                <table width="100%" cellspacing="0" cellpadding="4">
                  <tr>
                    <td style="color: #666677; font-size: 14px; width: 90px; font-weight: 600;">Email:</td>
                    <td style="color: #1A1A2E; font-size: 14px; font-weight: 700;">${to}</td>
                  </tr>
                  <tr>
                    <td style="color: #666677; font-size: 14px; font-weight: 600;">Password:</td>
                    <td style="color: #E67E22; font-size: 15px; font-weight: 800; font-family: monospace; letter-spacing: 1px;">${password}</td>
                  </tr>
                </table>
              </div>

              <!-- Biometric notice -->
              <div style="background-color: #F5E6D3; border-radius: 12px; padding: 14px 16px; margin-bottom: 28px; display: flex; align-items: center;">
                <p style="margin: 0; color: #1A1A2E; font-size: 13.5px; line-height: 1.5;">
                  💡 <strong>Tip:</strong> After your first login, enable <strong>Biometric Authentication (Fingerprint / Face ID)</strong> in the app for instantaneous 1-tap access on your phone!
                </p>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #1A1A2E; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 700; padding: 15px 36px; border-radius: 9999px; box-shadow: 0 6px 18px rgba(26,26,46,0.25);">
                  Login to Chammery &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF5EE; padding: 22px 30px; text-align: center; border-top: 1px solid #F5E6D3;">
              <p style="margin: 0; color: #888899; font-size: 12px;">
                &copy; 2025 Chammery Meal Management. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return transporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
    to,
    subject: 'Welcome to Chammery! 🍽️',
    html,
  });
}

