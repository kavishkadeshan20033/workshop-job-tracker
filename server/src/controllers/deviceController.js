const DeviceModel = require('../models/Device');
const AuditModel = require('../models/Audit');

const deviceController = {
    async getAll(req, res, next) {
        try {
            const { customer_id } = req.query;
            const devices = customer_id 
                ? await DeviceModel.findByCustomerId(customer_id)
                : await DeviceModel.findAll();
            res.json(devices);
        } catch (error) {
            next(error);
        }
    },

    async getById(req, res, next) {
        try {
            const device = await DeviceModel.findById(req.params.id);
            if (!device) return res.status(404).json({ error: 'Device not found' });
            res.json(device);
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const device = await DeviceModel.create(req.body);
            
            await AuditModel.log({
                user_id: req.user.id,
                action: 'CREATE',
                entity: 'devices',
                entity_id: device.id,
                ip_address: req.ip,
            });

            res.status(201).json({ message: 'Device created successfully', device });
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const device = await DeviceModel.update(req.params.id, req.body);
            if (!device) return res.status(404).json({ error: 'Device not found' });

            await AuditModel.log({
                user_id: req.user.id,
                action: 'UPDATE',
                entity: 'devices',
                entity_id: device.id,
                ip_address: req.ip,
            });

            res.json({ message: 'Device updated successfully', device });
        } catch (error) {
            next(error);
        }
    },

    async delete(req, res, next) {
        try {
            const device = await DeviceModel.findById(req.params.id);
            if (!device) return res.status(404).json({ error: 'Device not found' });
            
            await DeviceModel.delete(req.params.id);
            
            await AuditModel.log({
                user_id: req.user.id,
                action: 'DELETE',
                entity: 'devices',
                entity_id: parseInt(req.params.id),
                ip_address: req.ip,
            });

            res.json({ message: 'Device deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = deviceController;
