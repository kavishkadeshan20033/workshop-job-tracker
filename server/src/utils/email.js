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

/**
 * Send notification email to technician when a job is assigned
 */
async function sendJobAssignedEmail({ to, technicianName, job, assignedBy }) {
    const sender = process.env.SMTP_USER || 'no-reply@workshoptracker.com';
    const recipientName = technicianName || 'Technician';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const portalJobsUrl = `${clientUrl.replace(/\/$/, '')}/jobs`;

    const priorityColors = {
        urgent: '#dc2626',
        high: '#e63946',
        medium: '#d97706',
        low: '#2a6fdb',
    };
    const priorityColor = priorityColors[(job.priority || '').toLowerCase()] || '#d97706';

    const formattedDate = job.date_in
        ? new Date(job.date_in).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : new Date().toLocaleDateString('en-US');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Job Assigned: #${job.id}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 0; }
        .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #eaecef; }
        .header { background: #1a1d24; padding: 24px 32px; text-align: left; }
        .header-title { color: #ffffff; font-size: 18px; font-weight: 700; margin: 0; }
        .badge-assigned { background: #e63946; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; }
        .content { padding: 32px; color: #2d3748; line-height: 1.6; }
        .greeting { font-size: 17px; font-weight: 600; color: #1a202c; margin-bottom: 8px; }
        .intro { font-size: 14px; color: #4a5568; margin-bottom: 24px; }
        .job-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
        .job-card-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .priority-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ffffff; }
        .desc-box { background: #ffffff; border-left: 4px solid #e63946; border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 6px; padding: 14px 16px; margin: 18px 0; font-size: 14px; color: #334155; }
        .btn-container { text-align: center; margin: 28px 0 12px; }
        .btn { display: inline-block; background: #e63946; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; letter-spacing: 0.3px; }
        .footer { background: #f8fafc; padding: 18px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span class="header-title">WorkshopTracker</span>
              </td>
              <td align="right">
                <span class="badge-assigned">New Assignment</span>
              </td>
            </tr>
          </table>
        </div>
        <div class="content">
          <div class="greeting">Hello, ${recipientName}</div>
          <p class="intro">
            A new repair job has been assigned to you by <strong>${assignedBy || 'Admin'}</strong>. Here are the job details:
          </p>

          <div class="job-card">
            <div class="job-card-title">Job Information</div>
            <table width="100%" border="0" cellpadding="6" cellspacing="0" style="font-size: 14px;">
              <tr>
                <td style="color: #718096; font-weight: 500;">Job ID:</td>
                <td align="right" style="color: #1a202c; font-weight: 700; font-family: monospace; font-size: 15px;">#${job.id}</td>
              </tr>
              <tr>
                <td style="color: #718096; font-weight: 500;">Device:</td>
                <td align="right" style="color: #1a202c; font-weight: 600;">${job.device_name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="color: #718096; font-weight: 500;">Priority:</td>
                <td align="right">
                  <span class="priority-badge" style="background-color: ${priorityColor};">${(job.priority || 'medium').toUpperCase()}</span>
                </td>
              </tr>
              <tr>
                <td style="color: #718096; font-weight: 500;">Status:</td>
                <td align="right" style="color: #1a202c; font-weight: 600; text-transform: capitalize;">${(job.status || 'pending').replace('_', ' ')}</td>
              </tr>
              <tr>
                <td style="color: #718096; font-weight: 500;">Date Received:</td>
                <td align="right" style="color: #1a202c; font-weight: 600;">${formattedDate}</td>
              </tr>
              ${job.customer_name ? `
              <tr>
                <td style="color: #718096; font-weight: 500;">Customer:</td>
                <td align="right" style="color: #1a202c; font-weight: 600;">${job.customer_name} ${job.customer_phone ? `(${job.customer_phone})` : ''}</td>
              </tr>
              ` : ''}
              ${job.estimated_cost ? `
              <tr>
                <td style="color: #718096; font-weight: 500;">Estimated Cost:</td>
                <td align="right" style="color: #1a202c; font-weight: 600;">$${job.estimated_cost}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="font-weight: 600; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            Problem Description:
          </div>
          <div class="desc-box">
            ${job.problem_description || 'No description provided.'}
          </div>

          <div class="btn-container">
            <a href="${portalJobsUrl}" class="btn">Open Jobs in WorkshopTracker &rarr;</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} WorkshopTracker &bull; Automated notification sent to ${to}
        </div>
      </div>
    </body>
    </html>
    `;

    const plainText = `Hello ${recipientName},\n\nA new repair job (#${job.id}) has been assigned to you by ${assignedBy || 'Admin'}.\n\nJob Details:\n- Job ID: #${job.id}\n- Device: ${job.device_name}\n- Customer: ${job.customer_name || 'N/A'} ${job.customer_phone ? `(${job.customer_phone})` : ''}\n- Priority: ${(job.priority || 'medium').toUpperCase()}\n- Status: ${job.status || 'pending'}\n- Date: ${formattedDate}\n- Problem: ${job.problem_description || 'N/A'}\n\nPlease visit the workshop portal to review and manage this job: ${portalJobsUrl}`;

    try {
        const mailClient = getTransporter();
        const info = await mailClient.sendMail({
            from: `"WorkshopTracker" <${sender}>`,
            to,
            subject: `🔧 New Job Assigned: Job #${job.id} — ${job.device_name}`,
            text: plainText,
            html: htmlContent,
        });
        logger.info(`Technician job assignment email sent to ${to} for Job #${job.id} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Failed to send job assignment email to ${to} for Job #${job.id}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Send confirmation email to customer when a job is created
 */
async function sendJobCreatedCustomerEmail({ to, customerName, job }) {
    const sender = process.env.SMTP_USER || 'no-reply@workshoptracker.com';
    const recipientName = customerName || 'Valued Customer';

    const formattedDate = job.date_in
        ? new Date(job.date_in).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : new Date().toLocaleDateString('en-US');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Repair Job Received: #${job.id}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 0; }
        .container { max-width: 560px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #eaecef; }
        .header { background: #1a1d24; padding: 24px 32px; text-align: left; }
        .header-title { color: #ffffff; font-size: 18px; font-weight: 700; margin: 0; }
        .header-subtitle { color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.8px; }
        .content { padding: 32px; color: #2d3748; line-height: 1.6; }
        .greeting { font-size: 17px; font-weight: 600; color: #1a202c; margin-bottom: 8px; }
        .intro { font-size: 14px; color: #4a5568; margin-bottom: 22px; }
        .job-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px; }
        .desc-box { background: #ffffff; border-left: 4px solid #2a6fdb; border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #334155; }
        .footer { background: #f8fafc; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-title">WorkshopTracker</div>
          <div class="header-subtitle">Repair Service Confirmation</div>
        </div>
        <div class="content">
          <div class="greeting">Hello, ${recipientName}</div>
          <p class="intro">
            Thank you for choosing us! We have received your device and registered your repair job in our system.
          </p>

          <div class="job-card">
            <table width="100%" border="0" cellpadding="6" cellspacing="0" style="font-size: 14px;">
              <tr>
                <td style="color: #718096; font-weight: 500;">Job Number:</td>
                <td align="right" style="color: #1a202c; font-weight: 700; font-family: monospace; font-size: 15px;">#${job.id}</td>
              </tr>
              <tr>
                <td style="color: #718096; font-weight: 500;">Device:</td>
                <td align="right" style="color: #1a202c; font-weight: 600;">${job.device_name || 'Device'}</td>
              </tr>
              <tr>
                <td style="color: #718096; font-weight: 500;">Date Received:</td>
                <td align="right" style="color: #1a202c; font-weight: 600;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="color: #718096; font-weight: 500;">Status:</td>
                <td align="right" style="color: #1a202c; font-weight: 600; text-transform: capitalize;">${(job.status || 'pending').replace('_', ' ')}</td>
              </tr>
              ${job.technician_name ? `
              <tr>
                <td style="color: #718096; font-weight: 500;">Technician:</td>
                <td align="right" style="color: #1a202c; font-weight: 600;">${job.technician_name}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="font-weight: 600; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            Reported Issue:
          </div>
          <div class="desc-box">
            ${job.problem_description || 'General inspection and repair.'}
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            Our team will inspect your device and keep you informed of our progress. If you have questions, please mention Job #${job.id} when contacting us.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} WorkshopTracker &bull; Thank you for your business!
        </div>
      </div>
    </body>
    </html>
    `;

    const plainText = `Hello ${recipientName},\n\nThank you for choosing us! We have received your device and registered Job #${job.id}.\n\nDevice: ${job.device_name}\nDate Received: ${formattedDate}\nStatus: ${job.status || 'pending'}\nReported Issue: ${job.problem_description || 'General repair'}\n\nOur team will keep you updated.`;

    try {
        const mailClient = getTransporter();
        const info = await mailClient.sendMail({
            from: `"WorkshopTracker" <${sender}>`,
            to,
            subject: `Repair Job #${job.id} Received — ${job.device_name}`,
            text: plainText,
            html: htmlContent,
        });
        logger.info(`Customer job confirmation email sent to ${to} for Job #${job.id} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Failed to send customer confirmation email to ${to} for Job #${job.id}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendPasswordResetEmail,
    sendJobAssignedEmail,
    sendJobCreatedCustomerEmail,
};
