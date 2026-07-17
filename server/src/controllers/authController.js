const UserModel = require('../models/User');
const AuditModel = require('../models/Audit');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const logger = require('../middleware/logger');

const authController = {
    async register(req, res, next) {
        try {
            const { username, email, password, full_name, role } = req.body;

            // Check if username or email already exists
            if (UserModel.findByUsername(username)) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (UserModel.findByEmail(email)) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            const password_hash = await hashPassword(password);
            const user = UserModel.create({ username, email, password_hash, full_name, role: role || 'technician' });

            AuditModel.log({
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
            const user = UserModel.findByUsername(username);

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

            AuditModel.log({
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

    getProfile(req, res, next) {
        try {
            const user = UserModel.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    getUsers(req, res, next) {
        try {
            const users = UserModel.findAll();
            res.json(users);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = authController;
