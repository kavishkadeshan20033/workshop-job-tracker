const UserModel = require('../models/User');
const AuditModel = require('../models/Audit');

const userController = {
    getAll(req, res, next) {
        try {
            const users = UserModel.findAll();
            res.json(users);
        } catch (error) { next(error); }
    },

    getById(req, res, next) {
        try {
            const user = UserModel.findById(req.params.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        } catch (error) { next(error); }
    },

    create(req, res, next) {
        try {
            const existing = UserModel.findByUsername(req.body.username);
            if (existing) return res.status(400).json({ error: 'Username already exists' });
            
            const user = UserModel.create(req.body);
            AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'users', entity_id: user.id, ip_address: req.ip });
            res.status(201).json(user);
        } catch (error) { next(error); }
    },

    update(req, res, next) {
        try {
            const existing = UserModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'User not found' });
            
            const user = UserModel.update(req.params.id, req.body);
            AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'users', entity_id: user.id, ip_address: req.ip });
            res.json(user);
        } catch (error) { next(error); }
    },

    delete(req, res, next) {
        try {
            if (parseInt(req.params.id) === req.user.id) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }
            const existing = UserModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'User not found' });
            
            UserModel.delete(req.params.id);
            AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'users', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'User deleted successfully' });
        } catch (error) { next(error); }
    }
};

module.exports = userController;
