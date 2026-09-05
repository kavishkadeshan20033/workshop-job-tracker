const JobModel = require('../models/Job');
const JobNoteModel = require('../models/JobNote');
const AuditModel = require('../models/Audit');
const { sendJobAssignedEmail, sendJobCreatedCustomerEmail } = require('../utils/email');
const logger = require('../middleware/logger');

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
            
            await AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'jobs', entity_id: job.id, ip_address: req.ip });

            // Fetch complete job record with customer and technician details
            const fullJob = await JobModel.findById(job.id);

            // Asynchronously dispatch email notifications (non-blocking)
            (async () => {
                try {
                    // 1. Notify assigned technician
                    if (fullJob?.technician_email) {
                        logger.info(`Notifying technician ${fullJob.technician_name} (${fullJob.technician_email}) for Job #${job.id}`);
                        await sendJobAssignedEmail({
                            to: fullJob.technician_email,
                            technicianName: fullJob.technician_name || 'Technician',
                            job: fullJob,
                            assignedBy: req.user.username || 'Admin'
                        });
                    }

                    // 2. Notify customer (if email provided)
                    if (fullJob?.customer_email) {
                        logger.info(`Notifying customer ${fullJob.customer_name} (${fullJob.customer_email}) for Job #${job.id}`);
                        await sendJobCreatedCustomerEmail({
                            to: fullJob.customer_email,
                            customerName: fullJob.customer_name || 'Valued Customer',
                            job: fullJob
                        });
                    }
                } catch (emailErr) {
                    logger.error(`Error sending email notifications for Job #${job.id}: ${emailErr.message}`);
                }
            })();

            res.status(201).json(fullJob || job);
        } catch (error) { next(error); }
    },

    async update(req, res, next) {
        try {
            const existing = await JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });
            
            const job = await JobModel.update(req.params.id, req.body);
            
            await AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'jobs', entity_id: job.id, ip_address: req.ip });

            // Check if technician assignment changed
            const isTechnicianReassigned = req.body.technician_id && 
                parseInt(req.body.technician_id) !== existing.technician_id;

            if (isTechnicianReassigned) {
                const fullJob = await JobModel.findById(job.id);
                if (fullJob?.technician_email) {
                    (async () => {
                        try {
                            logger.info(`Notifying reassigned technician ${fullJob.technician_name} (${fullJob.technician_email}) for Job #${job.id}`);
                            await sendJobAssignedEmail({
                                to: fullJob.technician_email,
                                technicianName: fullJob.technician_name || 'Technician',
                                job: fullJob,
                                assignedBy: req.user.username || 'Admin'
                            });
                        } catch (emailErr) {
                            logger.error(`Error sending reassignment email for Job #${job.id}: ${emailErr.message}`);
                        }
                    })();
                }
            }

            res.json(job);
        } catch (error) { next(error); }
    },

    async updateStatus(req, res, next) {
        try {
            const existing = await JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });

            // Employees can only mark a job as done_pending_verification, not directly complete it
            if (req.user.role === 'employee' && req.body.status === 'completed') {
                return res.status(403).json({ error: 'Employees cannot directly complete a job. Use "Mark as Done" instead.' });
            }
            
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

    async verifyJob(req, res, next) {
        try {
            const existing = await JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });

            if (existing.status !== 'done_pending_verification') {
                return res.status(400).json({ error: 'Job is not pending verification.' });
            }

            const { action, note } = req.body;

            if (action === 'approve') {
                const job = await JobModel.update(req.params.id, { status: 'completed' });

                // Auto-generate invoice if not already exists
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
                        notes: 'Auto-generated invoice after admin verification.'
                    });
                }

                if (note) {
                    await JobNoteModel.create({ job_id: job.id, employee_id: req.user.id, description: `✅ Admin verified: ${note}` });
                }

                await AuditModel.log({ user_id: req.user.id, action: 'VERIFY_APPROVE', entity: 'jobs', entity_id: job.id, details: 'Job approved and completed', ip_address: req.ip });
                return res.json(job);

            } else if (action === 'reject') {
                const job = await JobModel.update(req.params.id, { status: 'in_progress' });

                if (note) {
                    await JobNoteModel.create({ job_id: job.id, employee_id: req.user.id, description: `↩ Admin rejected: ${note}` });
                }

                await AuditModel.log({ user_id: req.user.id, action: 'VERIFY_REJECT', entity: 'jobs', entity_id: job.id, details: `Job rejected: ${note || 'No reason provided'}`, ip_address: req.ip });
                return res.json(job);
            }
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
