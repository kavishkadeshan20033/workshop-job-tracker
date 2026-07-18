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
            delete updateData.password;

            const user = await UserModel.update(req.params.id, updateData);
            await AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'users', entity_id: user.id, ip_address: req.ip });
            res.json(user);
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
        } catch (error) { next(error); }
    }
};

module.exports = userController;
