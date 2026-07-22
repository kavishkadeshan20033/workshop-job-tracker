const nodemailer = require('nodemailer');

const createTransporter = () => {
    const port = Number(process.env.SMTP_PORT) || 587;
    const isGmail = process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail');
    
    const config = {
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: port,
        secure: port === 465, // Port 465 requires secure: true
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false // Helps avoid self-signed certificate / TLS errors in various hosts
        }
    };

    if (isGmail || process.env.SMTP_SERVICE === 'gmail') {
        config.service = 'gmail';
    }

    return nodemailer.createTransport(config);
};

const sendJobAssignmentEmail = async (email, employeeName, jobDetails) => {
    if (!email || !process.env.SMTP_USER) {
        console.log(`[Mailer] Skipping email to ${email} (SMTP not fully configured in .env)`);
        return;
    }

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: `"Workshop Admin" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `New Job Assigned: #${jobDetails.id} - ${jobDetails.device_name}`,
            text: `Hello ${employeeName},\n\nYou have been assigned a new job.\n\nJob ID: #${jobDetails.id}\nDevice: ${jobDetails.device_name}\nProblem: ${jobDetails.problem_description}\nPriority: ${jobDetails.priority}\n\nPlease log in to the Workshop system to view more details.\n\nBest regards,\nWorkshop System`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #1e293b;">New Job Assignment</h2>
                    <p style="color: #334155; font-size: 16px;">Hello <strong>${employeeName}</strong>,</p>
                    <p style="color: #334155; font-size: 16px;">You have been assigned a new job in the Workshop system.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 5px 0; color: #0f172a;"><strong>Job ID:</strong> #${jobDetails.id}</p>
                        <p style="margin: 5px 0; color: #0f172a;"><strong>Device:</strong> ${jobDetails.device_name}</p>
                        <p style="margin: 5px 0; color: #0f172a;"><strong>Problem:</strong> ${jobDetails.problem_description}</p>
                        <p style="margin: 5px 0; color: #0f172a;"><strong>Priority:</strong> <span style="text-transform: uppercase;">${jobDetails.priority}</span></p>
                    </div>

                    <p style="color: #334155; font-size: 16px;">Please log in to your employee dashboard to view more details and start progress.</p>
                    <br/>
                    <p style="color: #64748b; font-size: 14px;">Best regards,<br/>Workshop System</p>
                </div>
            `
        });
        console.log(`[Mailer] Assignment email sent successfully to ${email} (Message ID: ${info.messageId})`);
    } catch (error) {
        console.error(`[Mailer] Failed to send email to ${email}:`, error);
    }
};

module.exports = {
    sendJobAssignmentEmail
};
