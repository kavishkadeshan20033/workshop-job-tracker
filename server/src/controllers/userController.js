const UserModel = require('../models/User');
const AuditModel = require('../models/Audit');

const userController = {
    async getAll(req, res, next) {
        try {
            const users = await UserModel.findAll();
            res.json(users);
        } catch (error) { next(error); }
    },

    async getById(req, res, next) {
        try {
            const user = await UserModel.findById(req.params.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        } catch (error) { next(error); }
    },

    async create(req, res, next) {
        try {
            const existing = await UserModel.findByUsername(req.body.username);
            if (existing) return res.status(400).json({ error: 'Username already exists' });
            
            const user = await UserModel.create(req.body);
            await AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'users', entity_id: user.id, ip_address: req.ip });
            res.status(201).json(user);
        } catch (error) { next(error); }
    },

    async update(req, res, next) {
        try {
            const existing = await UserModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'User not found' });
            
            const updateData = { ...req.body };
            if (!updateData.password || !updateData.password.trim()) {
                delete updateData.password;
            } else if (updateData.password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }

            const user = await UserModel.update(req.params.id, updateData);
            await AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'users', entity_id: user.id, ip_address: req.ip });
            res.json(user);
        } catch (error) { next(error); }
    },

    async changePassword(req, res, next) {
        try {
            const { password } = req.body;
            if (!password || password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters long' });
            }

            const existing = await UserModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'User not found' });

            await UserModel.update(req.params.id, { password });
            await AuditModel.log({ user_id: req.user.id, action: 'ADMIN_CHANGE_PASSWORD', entity: 'users', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: `Password for ${existing.username} has been updated successfully` });
        } catch (error) { next(error); }
    },

    async delete(req, res, next) {
        try {
            if (parseInt(req.params.id) === req.user.id) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }
            const existing = await UserModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'User not found' });
            
            await UserModel.delete(req.params.id);
            await AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'users', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
                return res.status(400).json({ error: 'Cannot delete this user because they have recorded jobs or audit entries. Deactivate the user account instead.' });
            }
            next(error);
        }
    }
};

module.exports = userController;
