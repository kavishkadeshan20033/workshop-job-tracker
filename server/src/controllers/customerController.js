const CustomerModel = require('../models/Customer');
const VehicleModel = require('../models/Vehicle');
const AuditModel = require('../models/Audit');

const customerController = {
    async getAll(req, res, next) {
        try {
            const { search } = req.query;
            const customers = await CustomerModel.findAll(search);
            res.json(customers);
        } catch (error) { next(error); }
    },

    async getById(req, res, next) {
        try {
            const customer = await CustomerModel.findById(req.params.id);
            if (!customer) return res.status(404).json({ error: 'Customer not found' });
            const vehicles = await VehicleModel.findByCustomerId(req.params.id);
            res.json({ ...customer, vehicles });
        } catch (error) { next(error); }
    },

    async create(req, res, next) {
        try {
            const customer = await CustomerModel.create(req.body);
            await AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'customers', entity_id: customer.id, ip_address: req.ip });
            res.status(201).json(customer);
        } catch (error) { next(error); }
    },

    async update(req, res, next) {
        try {
            const existing = await CustomerModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Customer not found' });
            const customer = await CustomerModel.update(req.params.id, req.body);
            await AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'customers', entity_id: customer.id, ip_address: req.ip });
            res.json(customer);
        } catch (error) { next(error); }
    },

    async delete(req, res, next) {
        try {
            const existing = await CustomerModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Customer not found' });
            await CustomerModel.delete(req.params.id);
            await AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'customers', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Customer deleted successfully' });
        } catch (error) { next(error); }
    },
};

module.exports = customerController;
