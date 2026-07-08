import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

// Startup logs removed for production

// Create Nodemailer transporter using env variables
console.log("========== SMTP CONFIG ==========");
console.log({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  hasPass: !!process.env.SMTP_PASS,
  passLength: process.env.SMTP_PASS?.length,
});
console.log("=================================");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Verify connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('SMTP connection failed:', error);
  } else {
    console.log('✅ Gmail SMTP connected successfully');
  }
});

interface EmailTemplateParams {
  recipientName: string;
  title: string;
  subtitle: string;
  otp: string;
  expiryMinutes: number;
}

// Reusable email template generator (Referencing Hosted Favicon, Zero Attachments)
export const generateEmailTemplate = ({
  recipientName,
  title,
  subtitle,
  otp,
  expiryMinutes,
}: EmailTemplateParams) => {
  const clientUrl = process.env.CLIENT_URL || '';
  const logoUrl = `${clientUrl}/favicon.svg`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .body-bg {
        background-color: #0f172a !important;
      }
      .card-bg {
        background-color: #1e293b !important;
        border-color: #334155 !important;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.3) !important;
      }
      .text-title {
        color: #f8fafc !important;
      }
      .text-subtitle {
        color: #94a3b8 !important;
      }
      .text-body {
        color: #cbd5e1 !important;
      }
      .otp-container {
        background-color: #2c1a16 !important;
        border-color: #ff5a1f !important;
        box-shadow: inset 0 2px 4px rgba(255, 90, 31, 0.15) !important;
      }
      .warning-card {
        background-color: #272312 !important;
        border-color: #713f12 !important;
        color: #fef08a !important;
      }
      .divider {
        border-top-color: #334155 !important;
      }
      .footer-subtext {
        color: #64748b !important;
      }
    }
  </style>
</head>
<body class="body-bg" style="background-color: #f5f7fa; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0;">
  <!-- Elevated Floating SaaS card with layered shadows and top orange line -->
  <div class="card-bg" style="background-color: #ffffff; border-radius: 16px; max-width: 500px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-top: 4px solid #ff5a1f; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.02), 0 4px 6px -4px rgba(0,0,0,0.02), 0 20px 25px -5px rgba(0,0,0,0.04);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="${logoUrl}" width="48" height="48" alt="Kindred Logo" style="display: block; margin: 0 auto;" />
      <div class="text-title" style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 8px; letter-spacing: -0.5px;">Kindred</div>
      <div style="font-size: 10px; font-weight: 600; color: #ff5a1f; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">Find Your Kindred. Build Together.</div>
    </div>
    
    <div class="divider" style="border-top: 1px solid #f1f5f9; margin: 24px 0;"></div>

    <h2 class="text-title" style="font-size: 22px; font-weight: 800; color: #0f172a; text-align: center; margin: 0 0 8px 0; letter-spacing: -0.5px;">${title}</h2>
    <p class="text-subtitle" style="font-size: 14px; color: #475569; text-align: center; margin: 0 0 24px 0; line-height: 1.5;">${subtitle}</p>

    <p class="text-body" style="font-size: 14px; color: #334155; line-height: 1.5; margin: 24px 0 12px 0;">
      Hi <strong>${recipientName}</strong>,
    </p>
    <p class="text-body" style="font-size: 14px; color: #334155; line-height: 1.5; margin: 0 0 24px 0;">
      Please use the secure One-Time Password (OTP) below to verify your account request:
    </p>

    <!-- Elevated OTP Container with soft depth -->
    <div class="otp-container" style="background-color: #fff8f5; border: 1.5px solid #ff5a1f; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ff5a1f; box-shadow: inset 0 2px 4px rgba(255, 90, 31, 0.05), 0 4px 10px rgba(255, 90, 31, 0.04);">
      ${otp}
    </div>

    <!-- Security Alert -->
    <div class="warning-card" style="background-color: #fffbeb; border: 1px solid #fde047; border-radius: 8px; padding: 12px 16px; margin: 24px 0; font-size: 12px; color: #854d0e; line-height: 1.5;">
      <strong>⚠ Security Notice:</strong> Never share this verification code with anyone. Kindred will never ask for your OTP.
    </div>

    <!-- Info details -->
    <p class="text-subtitle" style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 24px 0 0 0;">
      • This code is valid for <strong>${expiryMinutes} minutes</strong>.
      <br />
      • If you did not make this request, you can safely ignore this email.
    </p>

    <!-- Footer -->
    <div class="divider" style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
      <div class="text-title" style="font-size: 13px; font-weight: 800; color: #475569;">Kindred</div>
      <div class="text-subtitle" style="font-size: 11px; color: #64748b; margin-top: 2px;">Student Collaboration Platform</div>
      <div class="footer-subtext" style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Built for BMSCE Students</div>
      <div style="font-size: 10px; color: #cbd5e1; margin-top: 16px;">&copy; 2026 Kindred. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
======================================
${title}
======================================

Hi ${recipientName},

${subtitle}

Your 6-digit verification code is: ${otp}

This code is valid for ${expiryMinutes} minutes.

Security Notice: Never share this verification code with anyone. Kindred will never ask for your OTP.

--------------------------------------
Kindred
Student Collaboration Platform
Built for BMSCE Students
© 2026 Kindred. All rights reserved.
======================================
  `.trim();

  return { html, text };
};

export const sendOtpEmail = async (email: string, otp: string, name: string) => {
  try {
    const { html, text } = generateEmailTemplate({
      recipientName: name,
      title: 'Verify Your Email',
      subtitle: 'Thank you for registering at Kindred. To complete your verification and access the platform, please use the 6-digit One-Time Password (OTP) below:',
      otp,
      expiryMinutes: 5,
    });

    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Verify Your Kindred Account',
      html,
      text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Verification OTP sent to ${email}`);

    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (email: string, otp: string, name: string) => {
  try {
    const { html, text } = generateEmailTemplate({
      recipientName: name,
      title: 'Reset Your Password',
      subtitle: 'You requested to reset your password. Use the secure 6-digit verification code below to verify your request:',
      otp,
      expiryMinutes: 10,
    });

    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Reset Your Kindred Password',
      html,
      text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Password reset OTP sent to ${email}`);

    return true;
  } catch (error) {
    console.error('Error sending reset OTP email:', error);
    return false;
  }
};
