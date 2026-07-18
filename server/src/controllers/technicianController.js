const TechnicianModel = require('../models/Technician');
const AuditModel = require('../models/Audit');

const technicianController = {
    async getAll(req, res, next) {
        try {
            const technicians = await TechnicianModel.findAll();
            res.json(technicians);
        } catch (error) { next(error); }
    },

    async getById(req, res, next) {
        try {
            const technician = await TechnicianModel.findById(req.params.id);
            if (!technician) return res.status(404).json({ error: 'Technician not found' });
            res.json(technician);
        } catch (error) { next(error); }
    },

    async create(req, res, next) {
        try {
            const technician = await TechnicianModel.create(req.body);
            await AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'technicians', entity_id: technician.id, ip_address: req.ip });
            res.status(201).json(technician);
        } catch (error) { next(error); }
    },

    async update(req, res, next) {
        try {
            const existing = await TechnicianModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Technician not found' });
            const technician = await TechnicianModel.update(req.params.id, req.body);
            await AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'technicians', entity_id: technician.id, ip_address: req.ip });
            res.json(technician);
        } catch (error) { next(error); }
    },

    async delete(req, res, next) {
        try {
            const existing = await TechnicianModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Technician not found' });
            await TechnicianModel.delete(req.params.id);
            await AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'technicians', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Technician deleted successfully' });
        } catch (error) { next(error); }
    }
};

module.exports = technicianController;
