const PartModel = require('../models/Part');
const AuditModel = require('../models/Audit');

const partController = {
    getAll(req, res, next) {
        try {
            const { search } = req.query;
            const parts = PartModel.findAll(search);
            res.json(parts);
        } catch (error) { next(error); }
    },

    getById(req, res, next) {
        try {
            const part = PartModel.findById(req.params.id);
            if (!part) return res.status(404).json({ error: 'Part not found' });
            res.json(part);
        } catch (error) { next(error); }
    },

    create(req, res, next) {
        try {
            const part = PartModel.create(req.body);
            AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'parts', entity_id: part.id, ip_address: req.ip });
            res.status(201).json(part);
        } catch (error) { next(error); }
    },

    update(req, res, next) {
        try {
            const existing = PartModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Part not found' });
            const part = PartModel.update(req.params.id, req.body);
            AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'parts', entity_id: part.id, ip_address: req.ip });
            res.json(part);
        } catch (error) { next(error); }
    },

    delete(req, res, next) {
        try {
            const existing = PartModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Part not found' });
            PartModel.delete(req.params.id);
            AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'parts', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Part deleted successfully' });
        } catch (error) { next(error); }
    },

    getLowStock(req, res, next) {
        try {
            const parts = PartModel.getLowStock();
            res.json(parts);
        } catch (error) { next(error); }
    },
};

module.exports = partController;
