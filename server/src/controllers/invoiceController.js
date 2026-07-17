const InvoiceModel = require('../models/Invoice');
const AuditModel = require('../models/Audit');

const invoiceController = {
    getAll(req, res, next) {
        try {
            const invoices = InvoiceModel.findAll();
            res.json(invoices);
        } catch (error) { next(error); }
    },

    getById(req, res, next) {
        try {
            const invoice = InvoiceModel.findById(req.params.id);
            if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
            res.json(invoice);
        } catch (error) { next(error); }
    },

    create(req, res, next) {
        try {
            const existing = InvoiceModel.findByJobId(req.body.job_id);
            if (existing) return res.status(400).json({ error: 'Invoice already exists for this job' });
            const invoice = InvoiceModel.create(req.body);
            AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'invoices', entity_id: invoice.id, ip_address: req.ip });
            res.status(201).json(invoice);
        } catch (error) { next(error); }
    },

    update(req, res, next) {
        try {
            const existing = InvoiceModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Invoice not found' });
            const invoice = InvoiceModel.update(req.params.id, req.body);
            AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'invoices', entity_id: invoice.id, ip_address: req.ip });
            res.json(invoice);
        } catch (error) { next(error); }
    },

    delete(req, res, next) {
        try {
            const existing = InvoiceModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Invoice not found' });
            InvoiceModel.delete(req.params.id);
            AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'invoices', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Invoice deleted successfully' });
        } catch (error) { next(error); }
    },
};

module.exports = invoiceController;
