const TechnicianModel = require('../models/Technician');
const AuditModel = require('../models/Audit');

const technicianController = {
    getAll(req, res, next) {
        try {
            const technicians = TechnicianModel.findAll();
            res.json(technicians);
        } catch (error) { next(error); }
    },

    getById(req, res, next) {
        try {
            const technician = TechnicianModel.findById(req.params.id);
            if (!technician) return res.status(404).json({ error: 'Technician not found' });
            res.json(technician);
        } catch (error) { next(error); }
    },

    create(req, res, next) {
        try {
            const technician = TechnicianModel.create(req.body);
            AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'technicians', entity_id: technician.id, ip_address: req.ip });
            res.status(201).json(technician);
        } catch (error) { next(error); }
    },

    update(req, res, next) {
        try {
            const existing = TechnicianModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Technician not found' });
            const technician = TechnicianModel.update(req.params.id, req.body);
            AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'technicians', entity_id: technician.id, ip_address: req.ip });
            res.json(technician);
        } catch (error) { next(error); }
    },

    delete(req, res, next) {
        try {
            const existing = TechnicianModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Technician not found' });
            TechnicianModel.delete(req.params.id);
            AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'technicians', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Technician deleted successfully' });
        } catch (error) { next(error); }
    }
};

module.exports = technicianController;
