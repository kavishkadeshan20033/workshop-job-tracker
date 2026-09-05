const UserModel = require('../models/User');
const AuditModel = require('../models/Audit');
const PasswordResetModel = require('../models/PasswordReset');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/email');
const logger = require('../middleware/logger');

const authController = {
    async register(req, res, next) {
        try {
            const { username, email, password, full_name } = req.body;

            if (await UserModel.findByUsername(username)) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (await UserModel.findByEmail(email)) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            const user = await UserModel.create({ username, email, password, full_name, role: 'employee' });

            const TechnicianModel = require('../models/Technician');
            await TechnicianModel.create({
                user_id: user.id,
                name: full_name,
                specialization: 'General',
                phone: ''
            });

            await AuditModel.log({
                user_id: req.user?.id || user.id,
                action: 'REGISTER',
                entity: 'users',
                entity_id: user.id,
                ip_address: req.ip,
            });

            logger.info(`New user registered: ${username} (role: ${user.role})`);
            const token = generateToken(user);
            res.status(201).json({ message: 'User registered successfully', user, token });
        } catch (error) {
            next(error);
        }
    },

    async login(req, res, next) {
        try {
            const { username, password } = req.body;
            const user = await UserModel.findByUsername(username);

            if (!user) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            if (!user.is_active) {
                return res.status(403).json({ error: 'Account is disabled' });
            }

            const valid = await comparePassword(password, user.password_hash);
            if (!valid) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            await AuditModel.log({
                user_id: user.id,
                action: 'LOGIN',
                entity: 'users',
                entity_id: user.id,
                ip_address: req.ip,
            });

            const token = generateToken(user);
            logger.info(`User logged in: ${username}`);
            res.json({
                message: 'Login successful',
                user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role },
                token,
            });
        } catch (error) {
            next(error);
        }
    },

    async getProfile(req, res, next) {
        try {
            const user = await UserModel.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    async getUsers(req, res, next) {
        try {
            const users = await UserModel.findAll();
            res.json(users);
        } catch (error) {
            next(error);
        }
    },

    async forgotPassword(req, res, next) {
        try {
            const { identifier } = req.body;
            if (!identifier) {
                return res.status(400).json({ error: 'Username or email is required' });
            }

            const trimmed = identifier.trim();
            let user = await UserModel.findByUsername(trimmed);
            if (!user) {
                user = await UserModel.findByEmail(trimmed);
            }

            if (!user) {
                return res.status(404).json({ error: 'No account found with that username or email' });
            }

            if (!user.is_active) {
                return res.status(403).json({ error: 'Account is disabled. Please contact administrator.' });
            }

            // Generate 6-digit verification code
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            await PasswordResetModel.create({
                user_id: user.id,
                email: user.email,
                code,
                minutes: 15,
            });

            // Mask email for privacy (e.g. k***n@domain.com)
            const [userPart, domain] = user.email.split('@');
            const maskedEmail = userPart.length > 2
                ? `${userPart[0]}***${userPart.slice(-1)}@${domain}`
                : `***@${domain}`;

            // Attempt to send email via SMTP
            const emailResult = await sendPasswordResetEmail({
                to: user.email,
                name: user.full_name,
                code,
            });

            logger.info(`Password reset code generated for ${user.username} (${user.email}). Email sent: ${emailResult.success}`);

            res.json({
                message: emailResult.success
                    ? `Verification code sent to ${maskedEmail}`
                    : `Verification code generated for ${user.username}`,
                emailMasked: maskedEmail,
                emailSent: emailResult.success,
                // Provide fallback code if email sending failed or in dev mode so testing is never blocked
                devCode: !emailResult.success || process.env.NODE_ENV === 'development' ? code : undefined,
                emailNote: !emailResult.success
                    ? 'Email service is currently offline or unauthenticated. For testing and development, your code is provided below.'
                    : undefined,
            });
        } catch (error) {
            next(error);
        }
    },

    async resetPassword(req, res, next) {
        try {
            const { identifier, code, newPassword } = req.body;
            if (!identifier || !code || !newPassword) {
                return res.status(400).json({ error: 'Username/email, verification code, and new password are required' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters long' });
            }

            const trimmed = identifier.trim();
            let user = await UserModel.findByUsername(trimmed);
            if (!user) {
                user = await UserModel.findByEmail(trimmed);
            }

            if (!user) {
                return res.status(404).json({ error: 'Account not found' });
            }

            const validReset = await PasswordResetModel.findValid({
                user_id: user.id,
                code: String(code).trim(),
            });

            if (!validReset) {
                return res.status(400).json({ error: 'Invalid or expired verification code' });
            }

            // Update user's password in database
            await UserModel.update(user.id, { password: newPassword });

            // Mark code as used
            await PasswordResetModel.markUsed(validReset.id);

            await AuditModel.log({
                user_id: user.id,
                action: 'RESET_PASSWORD',
                entity: 'users',
                entity_id: user.id,
                ip_address: req.ip,
            });

            logger.info(`Password reset completed successfully for user: ${user.username}`);
            res.json({ message: 'Password has been reset successfully. You can now sign in with your new password.' });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = authController;
