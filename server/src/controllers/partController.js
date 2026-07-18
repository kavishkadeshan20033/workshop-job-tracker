const PartModel = require('../models/Part');
const AuditModel = require('../models/Audit');

const partController = {
    async getAll(req, res, next) {
        try {
            const { search } = req.query;
            const parts = await PartModel.findAll(search);
            res.json(parts);
        } catch (error) { next(error); }
    },

    async getById(req, res, next) {
        try {
            const part = await PartModel.findById(req.params.id);
            if (!part) return res.status(404).json({ error: 'Part not found' });
            res.json(part);
        } catch (error) { next(error); }
    },

    async create(req, res, next) {
        try {
            const part = await PartModel.create(req.body);
            await AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'parts', entity_id: part.id, ip_address: req.ip });
            res.status(201).json(part);
        } catch (error) { next(error); }
    },

    async update(req, res, next) {
        try {
            const existing = await PartModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Part not found' });
            const part = await PartModel.update(req.params.id, req.body);
            await AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'parts', entity_id: part.id, ip_address: req.ip });
            res.json(part);
        } catch (error) { next(error); }
    },

    async delete(req, res, next) {
        try {
            const existing = await PartModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Part not found' });
            await PartModel.delete(req.params.id);
            await AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'parts', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Part deleted successfully' });
        } catch (error) { next(error); }
    },

    async getLowStock(req, res, next) {
        try {
            const parts = await PartModel.getLowStock();
            res.json(parts);
        } catch (error) { next(error); }
    },
};

module.exports = partController;
