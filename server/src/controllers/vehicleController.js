const VehicleModel = require('../models/Vehicle');
const AuditModel = require('../models/Audit');

const vehicleController = {
    getAll(req, res, next) {
        try {
            const { customer_id } = req.query;
            const vehicles = customer_id 
                ? VehicleModel.findByCustomerId(customer_id)
                : VehicleModel.findAll();
            res.json(vehicles);
        } catch (error) {
            next(error);
        }
    },

    getById(req, res, next) {
        try {
            const vehicle = VehicleModel.findById(req.params.id);
            if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
            res.json(vehicle);
        } catch (error) {
            next(error);
        }
    },

    create(req, res, next) {
        try {
            const vehicle = VehicleModel.create(req.body);
            
            AuditModel.log({
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

    update(req, res, next) {
        try {
            const vehicle = VehicleModel.update(req.params.id, req.body);
            if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

            AuditModel.log({
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

    delete(req, res, next) {
        try {
            const vehicle = VehicleModel.findById(req.params.id);
            if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

            VehicleModel.delete(req.params.id);

            AuditModel.log({
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
