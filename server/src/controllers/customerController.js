const CustomerModel = require('../models/Customer');
const AuditModel = require('../models/Audit');

const customerController = {
    getAll(req, res, next) {
        try {
            const { search } = req.query;
            const customers = CustomerModel.findAll(search);
            res.json(customers);
        } catch (error) { next(error); }
    },

    getById(req, res, next) {
        try {
            const customer = CustomerModel.findById(req.params.id);
            if (!customer) return res.status(404).json({ error: 'Customer not found' });
            const vehicles = CustomerModel.getVehicles(req.params.id);
            res.json({ ...customer, vehicles });
        } catch (error) { next(error); }
    },

    create(req, res, next) {
        try {
            const customer = CustomerModel.create(req.body);
            AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'customers', entity_id: customer.id, ip_address: req.ip });
            res.status(201).json(customer);
        } catch (error) { next(error); }
    },

    update(req, res, next) {
        try {
            const existing = CustomerModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Customer not found' });
            const customer = CustomerModel.update(req.params.id, req.body);
            AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'customers', entity_id: customer.id, ip_address: req.ip });
            res.json(customer);
        } catch (error) { next(error); }
    },

    delete(req, res, next) {
        try {
            const existing = CustomerModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Customer not found' });
            CustomerModel.delete(req.params.id);
            AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'customers', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Customer deleted successfully' });
        } catch (error) { next(error); }
    },
};

module.exports = customerController;
