const InvoiceModel = require('../models/Invoice');
const AuditModel = require('../models/Audit');

const invoiceController = {
    async getAll(req, res, next) {
        try {
            const invoices = await InvoiceModel.findAll();
            res.json(invoices);
        } catch (error) { next(error); }
    },

    async getById(req, res, next) {
        try {
            const invoice = await InvoiceModel.findById(req.params.id);
            if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
            if (invoice.job_id) {
                const JobModel = require('../models/Job');
                invoice.parts = await JobModel.getParts(invoice.job_id);
            } else {
                invoice.parts = [];
            }
            res.json(invoice);
        } catch (error) { next(error); }
    },

    async create(req, res, next) {
        try {
            const existing = await InvoiceModel.findByJobId(req.body.job_id);
            let invoice;
            if (existing) {
                invoice = await InvoiceModel.update(existing.id, req.body);
            } else {
                invoice = await InvoiceModel.create(req.body);
            }
            await AuditModel.log({ user_id: req.user.id, action: existing ? 'UPDATE' : 'CREATE', entity: 'invoices', entity_id: invoice.id, ip_address: req.ip });
            res.status(existing ? 200 : 201).json(invoice);
        } catch (error) { next(error); }
    },

    async update(req, res, next) {
        try {
            const existing = await InvoiceModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Invoice not found' });
            const invoice = await InvoiceModel.update(req.params.id, req.body);
            await AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'invoices', entity_id: invoice.id, ip_address: req.ip });
            res.json(invoice);
        } catch (error) { next(error); }
    },

    async sendInvoiceEmail(req, res, next) {
        try {
            const invoice = await InvoiceModel.findById(req.params.id);
            if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
            
            const JobModel = require('../models/Job');
            const job = await JobModel.findById(invoice.job_id);
            if (invoice.job_id) {
                invoice.parts = await JobModel.getParts(invoice.job_id);
            } else {
                invoice.parts = [];
            }
            
            const targetEmail = req.body.email || invoice.customer_email || job?.customer_email;
            if (!targetEmail) {
                return res.status(400).json({ error: 'Customer has no email address on file. Please enter an email address.' });
            }

            const { sendCustomerInvoiceEmail } = require('../utils/email');
            const result = await sendCustomerInvoiceEmail({
                to: targetEmail,
                customerName: invoice.customer_name || job?.customer_name || 'Valued Customer',
                invoice,
                job
            });

            if (!result.success) {
                return res.status(500).json({ error: `Failed to send email: ${result.error}` });
            }

            await AuditModel.log({
                user_id: req.user.id,
                action: 'SEND_INVOICE_EMAIL',
                entity: 'invoices',
                entity_id: invoice.id,
                details: `Sent to ${targetEmail}`,
                ip_address: req.ip
            });

            res.json({ message: `Invoice sent successfully to ${targetEmail}` });
        } catch (error) { next(error); }
    },

    async delete(req, res, next) {
        try {
            const existing = await InvoiceModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Invoice not found' });
            await InvoiceModel.delete(req.params.id);
            await AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'invoices', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Invoice deleted successfully' });
        } catch (error) { next(error); }
    },
};

module.exports = invoiceController;
