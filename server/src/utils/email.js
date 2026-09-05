const nodemailer = require('nodemailer');
const logger = require('../middleware/logger');

let transporter = null;

function getTransporter() {
    if (!transporter) {
        const port = parseInt(process.env.SMTP_PORT || '465', 10);
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port,
            secure: port === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
            connectionTimeout: 10000,
            greetingTimeout: 5000,
        });
    }
    return transporter;
}

/**
 * Send password reset verification code email
 */
async function sendPasswordResetEmail({ to, name, code }) {
    const sender = process.env.SMTP_USER || 'no-reply@workshoptracker.com';
    const recipientName = name || 'User';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your WorkshopTracker Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 0; }
        .container { max-width: 540px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #eaecef; }
        .header { background: #1a1d24; padding: 28px 32px; text-align: center; }
        .header-title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
        .header-subtitle { color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 36px 32px; color: #2d3748; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; color: #1a202c; margin-bottom: 12px; }
        .instruction { font-size: 14px; color: #4a5568; margin-bottom: 24px; }
        .code-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
        .code-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #e63946; letter-spacing: 6px; margin: 0; }
        .expiry-note { font-size: 13px; color: #718096; margin-top: 8px; }
        .security-notice { font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 18px; margin-top: 28px; }
        .footer { background: #f8fafc; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-title">WorkshopTracker</div>
          <div class="header-subtitle">Password Reset Verification</div>
        </div>
        <div class="content">
          <div class="greeting">Hello, ${recipientName}</div>
          <p class="instruction">
            We received a request to reset the password for your WorkshopTracker account. Use the verification code below to complete your password reset:
          </p>
          <div class="code-box">
            <div class="code-label">Verification Code</div>
            <div class="code">${code}</div>
            <div class="expiry-note">This code will expire in <strong>15 minutes</strong>.</div>
          </div>
          <p style="font-size: 13px; color: #4a5568;">
            Enter this code in the password reset window to choose a new password.
          </p>
          <div class="security-notice">
            If you did not request this password reset, you can safely ignore this email. Your current password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} WorkshopTracker. Job Management System.
        </div>
      </div>
    </body>
    </html>
    `;

    try {
        const mailClient = getTransporter();
        const info = await mailClient.sendMail({
            from: `"WorkshopTracker" <${sender}>`,
            to,
            subject: `${code} is your WorkshopTracker verification code`,
            text: `Hello ${recipientName},\n\nYour WorkshopTracker password reset verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
            html: htmlContent,
        });
        logger.info(`Password reset email successfully sent to ${to} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Failed to send password reset email to ${to}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

module.exports = { sendPasswordResetEmail };
