const VehicleModel = require('../models/Vehicle');
const AuditModel = require('../models/Audit');

const vehicleController = {
    async getAll(req, res, next) {
        try {
            const { customer_id } = req.query;
            const vehicles = customer_id 
                ? await VehicleModel.findByCustomerId(customer_id)
                : await VehicleModel.findAll();
            res.json(vehicles);
        } catch (error) {
            next(error);
        }
    },

    async getById(req, res, next) {
        try {
            const vehicle = await VehicleModel.findById(req.params.id);
            if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
            res.json(vehicle);
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const vehicle = await VehicleModel.create(req.body);
            
            await AuditModel.log({
                user_id: req.user.id,
                action: 'CREATE',
                entity: 'vehicles',
                entity_id: vehicle.id,
                ip_address: req.ip,
            });

            res.status(201).json({ message: 'Vehicle created successfully', vehicle });
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const vehicle = await VehicleModel.update(req.params.id, req.body);
            if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

            await AuditModel.log({
                user_id: req.user.id,
                action: 'UPDATE',
                entity: 'vehicles',
                entity_id: vehicle.id,
                ip_address: req.ip,
            });

            res.json({ message: 'Vehicle updated successfully', vehicle });
        } catch (error) {
            next(error);
        }
    },

    async delete(req, res, next) {
        try {
            const vehicle = await VehicleModel.findById(req.params.id);
            if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

            await VehicleModel.delete(req.params.id);

            await AuditModel.log({
                user_id: req.user.id,
                action: 'DELETE',
                entity: 'vehicles',
                entity_id: req.params.id,
                ip_address: req.ip,
            });

            res.json({ message: 'Vehicle deleted successfully' });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = vehicleController;
