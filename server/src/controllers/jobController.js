const JobModel = require('../models/Job');
const JobNoteModel = require('../models/JobNote');
const AuditModel = require('../models/Audit');

const jobController = {
    async getAll(req, res, next) {
        try {
            const { status, search } = req.query;
            const jobs = await JobModel.findAll(search, status, req.user);
            res.json(jobs);
        } catch (error) { next(error); }
    },

    async getById(req, res, next) {
        try {
            const job = await JobModel.findById(req.params.id);
            if (!job) return res.status(404).json({ error: 'Job not found' });
            
            const parts = await JobModel.getParts(req.params.id);
            const notes = await JobNoteModel.findByJobId(req.params.id);
            
            res.json({ ...job, parts, notes });
        } catch (error) { next(error); }
    },

    async create(req, res, next) {
        try {
            const jobData = { ...req.body, created_by: req.user.id };
            const job = await JobModel.create(jobData);
            
            if (jobData.technician_id) {
                const TechnicianModel = require('../models/Technician');
                const technician = await TechnicianModel.findById(jobData.technician_id);
                if (technician && technician.email) {
                    const { sendJobAssignmentEmail } = require('../utils/mailer');
                    await sendJobAssignmentEmail(technician.email, technician.name, job);
                }
            }

            await AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'jobs', entity_id: job.id, ip_address: req.ip });
            res.status(201).json(job);
        } catch (error) { next(error); }
    },

    async update(req, res, next) {
        try {
            const existing = await JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });
            
            const job = await JobModel.update(req.params.id, req.body);
            
            if (req.body.technician_id && req.body.technician_id != existing.technician_id) {
                const TechnicianModel = require('../models/Technician');
                const technician = await TechnicianModel.findById(req.body.technician_id);
                if (technician && technician.email) {
                    const { sendJobAssignmentEmail } = require('../utils/mailer');
                    await sendJobAssignmentEmail(technician.email, technician.name, job);
                }
            }

            await AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'jobs', entity_id: job.id, ip_address: req.ip });
            res.json(job);
        } catch (error) { next(error); }
    },

    async updateStatus(req, res, next) {
        try {
            const existing = await JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });
            
            const job = await JobModel.update(req.params.id, { status: req.body.status });
            
            if (req.body.status === 'completed' && existing.status !== 'completed') {
                const InvoiceModel = require('../models/Invoice');
                const existingInvoice = await InvoiceModel.findByJobId(job.id);
                if (!existingInvoice) {
                    const db = require('../config/db');
                    const partsRow = await db.queryOne('SELECT COALESCE(SUM(quantity_used * unit_price_at_time), 0) as total FROM job_parts WHERE job_id = ?', [job.id]);
                    const partsTotal = partsRow?.total || 0;
                    const laborTotal = Math.max(0, (job.estimated_cost || 0) - partsTotal);
                    
                    await InvoiceModel.create({
                        job_id: job.id,
                        labor_total: laborTotal,
                        tax_rate: 0.10,
                        notes: 'Auto-generated invoice from job completion.'
                    });
                }
            }

            await AuditModel.log({ user_id: req.user.id, action: 'STATUS_CHANGE', entity: 'jobs', entity_id: job.id, details: `Status: ${req.body.status}`, ip_address: req.ip });
            res.json(job);
        } catch (error) { next(error); }
    },

    async delete(req, res, next) {
        try {
            const existing = await JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });
            
            await JobModel.delete(req.params.id);
            await AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'jobs', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Job deleted successfully' });
        } catch (error) { next(error); }
    },

    async addNote(req, res, next) {
        try {
            const existing = await JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });
            
            const note = await JobNoteModel.create({
                job_id: req.params.id,
                employee_id: req.user.id,
                description: req.body.description
            });
            await AuditModel.log({ user_id: req.user.id, action: 'ADD_NOTE', entity: 'jobs', entity_id: existing.id, ip_address: req.ip });
            res.status(201).json(note);
        } catch (error) { next(error); }
    },

    async addPart(req, res, next) {
        try {
            await JobModel.addPart(req.params.id, req.body.part_id, req.body.quantity_used, req.body.unit_price_at_time);
            res.status(201).json({ message: 'Part added' });
        } catch (error) { next(error); }
    },

    async deletePart(req, res, next) {
        try {
            await JobModel.removePart(req.params.partId);
            res.json({ message: 'Part removed from job' });
        } catch (error) { next(error); }
    },

    async getStats(req, res, next) {
        try {
            const stats = await JobModel.getStats();
            res.json(stats);
        } catch (error) { next(error); }
    },
};

module.exports = jobController;
