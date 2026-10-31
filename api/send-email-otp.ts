import nodemailer from 'nodemailer';

// In-memory OTP store with 10-minute expiry
interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpRecord>();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // use as is
      }
    }

    const email = body?.email?.toString().trim().toLowerCase();
    const displayName = body?.displayName?.toString().trim() || 'Valued Trader';
    const providedCode = body?.code?.toString().trim();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    // Use provided 6-digit code or generate a secure new one
    let code = (providedCode && /^\d{6}$/.test(providedCode)) 
      ? providedCode 
      : Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email, { code, expiresAt, attempts: 0 });

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Akuna Capital Security" <security@akunacpt.site>`,
        to: email,
        subject: `Your Akuna Capital Verification Code: ${code}`,
        text: `Hello ${displayName},\n\nYour 6-digit email verification code is: ${code}\n\nThis passcode expires in 10 minutes.\n\nBest regards,\nAkuna Capital Security Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 20px; background-color: #091420; color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">AKUNA CAPITAL</span>
              <p style="color: #94a3b8; font-size: 11px; margin-top: 6px; font-weight: 500;">Official Identity Verification Service • akunacpt.site</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 24px; color: #0f172a;">
              <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Verify your email address</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
                Hello <strong>${displayName}</strong>,<br>
                Thank you for joining Akuna Capital. To complete your account verification and protect your identity, please enter this one-time passcode:
              </p>

              <div style="text-align: center; margin: 24px 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; display: block;">
                  ${code}
                </span>
                <span style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; display: block;">
                  Expires in 10 minutes • Single-use only
                </span>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-bottom: 0;">
                If you did not initiate this request, no action is required and you can safely disregard this email.
              </p>
            </div>

            <div style="text-align: center; margin-top: 24px; font-size: 10px; color: #64748b;">
              © ${new Date().getFullYear()} Akuna Capital (akunacpt.site). All rights reserved. Automated security notification.
            </div>
          </div>
        `,
      });

      return res.status(200).json({ success: true, message: 'Verification email sent.' });
    }

    // Preview / Development fallback
    return res.status(200).json({
      success: true,
      previewMode: true,
      previewCode: code,
      message: 'Verification code generated.'
    });
  } catch (err: any) {
    console.error('Serverless send OTP error:', err);
    return res.status(500).json({ error: 'Failed to dispatch verification code.' });
  }
}
