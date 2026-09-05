const JobModel = require('../models/Job');
const JobNoteModel = require('../models/JobNote');
const AuditModel = require('../models/Audit');
const { 
    sendJobAssignedEmail, 
    sendJobCreatedCustomerEmail,
    sendJobVerifiedTechnicianEmail,
    sendJobCompletedCustomerEmail,
    sendJobRejectedTechnicianEmail,
    sendJobPendingVerificationAdminEmail
} = require('../utils/email');
const logger = require('../middleware/logger');

async function resolveTechnicianEmail(fullJob) {
    if (fullJob?.technician_email) return fullJob.technician_email;
    try {
        if (fullJob?.technician_id) {
            const TechnicianModel = require('../models/Technician');
            const tech = await TechnicianModel.findById(fullJob.technician_id);
            if (tech?.email) return tech.email;
        }
        if (fullJob?.technician_name) {
            const UserModel = require('../models/User');
            const u = await UserModel.findByUsername(fullJob.technician_name);
            if (u?.email) return u.email;
        }
    } catch (e) {
        logger.warn(`Could not resolve technician email: ${e.message}`);
    }
    return null;
}

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

            // Await email dispatch before ending function (critical for serverless / Vercel runtime)
            try {
                const techEmail = await resolveTechnicianEmail(fullJob);
                const emailPromises = [];

                if (techEmail) {
                    logger.info(`Sending job assignment email to technician ${fullJob?.technician_name} (${techEmail}) for Job #${job.id}`);
                    emailPromises.push(
                        sendJobAssignedEmail({
                            to: techEmail,
                            technicianName: fullJob?.technician_name || 'Technician',
                            job: fullJob,
                            assignedBy: req.user.username || 'Admin'
                        })
                    );
                }

                if (fullJob?.customer_email) {
                    logger.info(`Sending job confirmation email to customer ${fullJob.customer_name} (${fullJob.customer_email}) for Job #${job.id}`);
                    emailPromises.push(
                        sendJobCreatedCustomerEmail({
                            to: fullJob.customer_email,
                            customerName: fullJob.customer_name || 'Valued Customer',
                            job: fullJob
                        })
                    );
                }

                if (emailPromises.length > 0) {
                    await Promise.allSettled(emailPromises);
                }
            } catch (emailErr) {
                logger.error(`Error sending email notifications for Job #${job.id}: ${emailErr.message}`);
            }

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
                const techEmail = await resolveTechnicianEmail(fullJob);
                if (techEmail) {
                    try {
                        logger.info(`Sending reassignment email to technician ${fullJob?.technician_name} (${techEmail}) for Job #${job.id}`);
                        await sendJobAssignedEmail({
                            to: techEmail,
                            technicianName: fullJob?.technician_name || 'Technician',
                            job: fullJob,
                            assignedBy: req.user.username || 'Admin'
                        });
                    } catch (emailErr) {
                        logger.error(`Error sending reassignment email for Job #${job.id}: ${emailErr.message}`);
                    }
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

            // If technician marked as done_pending_verification, notify admin via email
            if (req.body.status === 'done_pending_verification') {
                try {
                    const fullJob = await JobModel.findById(job.id);
                    const adminEmail = process.env.SMTP_USER;
                    if (adminEmail) {
                        await sendJobPendingVerificationAdminEmail({
                            to: adminEmail,
                            adminName: 'Admin',
                            job: fullJob,
                            technicianName: fullJob?.technician_name || req.user.full_name || req.user.username
                        });
                    }
                } catch (emailErr) {
                    logger.error(`Error sending pending verification notice for Job #${job.id}: ${emailErr.message}`);
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

            const { action, note, service_price, labor_total, tax_rate } = req.body;

            if (action === 'approve') {
                const job = await JobModel.update(req.params.id, { status: 'completed' });

                // Auto-generate or update invoice with real pricing
                const InvoiceModel = require('../models/Invoice');
                const db = require('../config/db');
                const partsRow = await db.queryOne('SELECT COALESCE(SUM(quantity_used * unit_price_at_time), 0) as total FROM job_parts WHERE job_id = ?', [job.id]);
                const partsTotal = partsRow?.total || 0;
                
                // Determine labor charge: prioritize explicitly passed service_price / labor_total
                let finalLabor = 0;
                if (service_price !== undefined && service_price !== null && service_price !== '') {
                    finalLabor = parseFloat(service_price);
                } else if (labor_total !== undefined && labor_total !== null && labor_total !== '') {
                    finalLabor = parseFloat(labor_total);
                } else {
                    finalLabor = Math.max(0, (job.estimated_cost || 0) - partsTotal);
                }

                const finalTaxRate = (tax_rate !== undefined && tax_rate !== null && tax_rate !== '') ? parseFloat(tax_rate) : 0.10;

                const existingInvoice = await InvoiceModel.findByJobId(job.id);
                if (existingInvoice) {
                    await InvoiceModel.update(existingInvoice.id, {
                        labor_total: finalLabor,
                        parts_total: partsTotal,
                        tax_rate: finalTaxRate,
                        notes: note ? `Admin verified: ${note}` : existingInvoice.notes
                    });
                } else {
                    await InvoiceModel.create({
                        job_id: job.id,
                        labor_total: finalLabor,
                        parts_total: partsTotal,
                        tax_rate: finalTaxRate,
                        notes: note ? `Admin verified: ${note}` : 'Invoice generated upon admin verification.'
                    });
                }

                const finalCost = (finalLabor + partsTotal) * (1 + finalTaxRate);
                await JobModel.update(job.id, { final_cost: finalCost });

                if (note) {
                    await JobNoteModel.create({ job_id: job.id, employee_id: req.user.id, description: `✅ Admin verified: ${note}` });
                }

                await AuditModel.log({ user_id: req.user.id, action: 'VERIFY_APPROVE', entity: 'jobs', entity_id: job.id, details: `Job approved and completed (Service Price: Rs. ${finalLabor.toFixed(2)})`, ip_address: req.ip });

                // Dispatch approval notifications (awaited for serverless runtime)
                try {
                    const fullJob = await JobModel.findById(job.id);
                    const techEmail = await resolveTechnicianEmail(fullJob);
                    const emailPromises = [];

                    if (techEmail) {
                        logger.info(`Sending job approval email to technician ${fullJob?.technician_name} (${techEmail}) for Job #${job.id}`);
                        emailPromises.push(
                            sendJobVerifiedTechnicianEmail({
                                to: techEmail,
                                technicianName: fullJob?.technician_name || 'Technician',
                                job: fullJob,
                                adminName: req.user.full_name || req.user.username || 'Admin',
                                note: note || ''
                            })
                        );
                    }

                    if (fullJob?.customer_email) {
                        logger.info(`Sending job completed email to customer ${fullJob.customer_name} (${fullJob.customer_email}) for Job #${job.id}`);
                        emailPromises.push(
                            sendJobCompletedCustomerEmail({
                                to: fullJob.customer_email,
                                customerName: fullJob.customer_name || 'Valued Customer',
                                job: fullJob
                            })
                        );
                    }

                    if (emailPromises.length > 0) {
                        await Promise.allSettled(emailPromises);
                    }
                } catch (emailErr) {
                    logger.error(`Error sending verification approval emails for Job #${job.id}: ${emailErr.message}`);
                }

                return res.json(job);

            } else if (action === 'reject') {
                const job = await JobModel.update(req.params.id, { status: 'in_progress' });

                if (note) {
                    await JobNoteModel.create({ job_id: job.id, employee_id: req.user.id, description: `↩ Admin rejected: ${note}` });
                }

                await AuditModel.log({ user_id: req.user.id, action: 'VERIFY_REJECT', entity: 'jobs', entity_id: job.id, details: `Job rejected: ${note || 'No reason provided'}`, ip_address: req.ip });

                // Dispatch rejection email to technician (awaited for serverless runtime)
                try {
                    const fullJob = await JobModel.findById(job.id);
                    const techEmail = await resolveTechnicianEmail(fullJob);

                    if (techEmail) {
                        logger.info(`Sending rejection notice to technician ${fullJob?.technician_name} (${techEmail}) for Job #${job.id}`);
                        await sendJobRejectedTechnicianEmail({
                            to: techEmail,
                            technicianName: fullJob?.technician_name || 'Technician',
                            job: fullJob,
                            adminName: req.user.full_name || req.user.username || 'Admin',
                            note: note || 'Please review the device and resolve issues before re-submitting.'
                        });
                    }
                } catch (emailErr) {
                    logger.error(`Error sending rejection notice email for Job #${job.id}: ${emailErr.message}`);
                }

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
            const jobId = req.params.id;
            const existing = await JobModel.findById(jobId);
            if (!existing) return res.status(404).json({ error: 'Job not found' });

            const PartModel = require('../models/Part');
            const part = await PartModel.findById(req.body.part_id);
            if (!part) return res.status(404).json({ error: 'Part not found in catalog' });

            const quantity = parseInt(req.body.quantity_used || 1, 10);
            if (isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({ error: 'Quantity must be at least 1' });
            }

            const unitPrice = (req.body.unit_price_at_time !== undefined && req.body.unit_price_at_time !== null && req.body.unit_price_at_time !== '')
                ? parseFloat(req.body.unit_price_at_time)
                : parseFloat(part.unit_price || 0);

            // Add part record to job_parts
            await JobModel.addPart(jobId, part.id, quantity, unitPrice);

            // Deduct stock in parts catalog
            const db = require('../config/db');
            await db.runQuery('UPDATE parts SET stock_qty = GREATEST(0, stock_qty - ?) WHERE id = ?', [quantity, part.id]);

            // If an invoice exists for this job, recalculate its totals
            const InvoiceModel = require('../models/Invoice');
            const existingInvoice = await InvoiceModel.findByJobId(jobId);
            if (existingInvoice) {
                await InvoiceModel.update(existingInvoice.id);
            }

            // If job already has final_cost or is completed, recalculate final_cost
            if (existing.status === 'completed' || existing.final_cost) {
                const partsRow = await db.queryOne('SELECT COALESCE(SUM(quantity_used * unit_price_at_time), 0) as total FROM job_parts WHERE job_id = ?', [jobId]);
                const partsTotal = parseFloat(partsRow?.total || 0);
                const laborTotal = existingInvoice ? parseFloat(existingInvoice.labor_total || 0) : Math.max(0, (existing.estimated_cost || 0));
                const taxRate = existingInvoice ? parseFloat(existingInvoice.tax_rate || 0.10) : 0.10;
                const newFinalCost = (laborTotal + partsTotal) * (1 + taxRate);
                await JobModel.update(jobId, { final_cost: newFinalCost });
            }

            await AuditModel.log({ 
                user_id: req.user.id, 
                action: 'ADD_PART', 
                entity: 'jobs', 
                entity_id: parseInt(jobId), 
                details: `Added ${quantity}x ${part.name} (Rs. ${unitPrice.toFixed(2)}/unit)`, 
                ip_address: req.ip 
            });

            const updatedParts = await JobModel.getParts(jobId);
            res.status(201).json({ message: 'Part added successfully', parts: updatedParts });
        } catch (error) { next(error); }
    },

    async deletePart(req, res, next) {
        try {
            const jobId = req.params.id;
            const jobPartId = req.params.partId;
            const db = require('../config/db');

            const jobPart = await db.queryOne('SELECT * FROM job_parts WHERE id = ? AND job_id = ?', [jobPartId, jobId]);
            if (!jobPart) return res.status(404).json({ error: 'Job part not found' });

            // Restore stock in parts catalog
            await db.runQuery('UPDATE parts SET stock_qty = stock_qty + ? WHERE id = ?', [jobPart.quantity_used, jobPart.part_id]);

            // Remove from job_parts
            await JobModel.removePart(jobPartId);

            // If an invoice exists for this job, recalculate its totals
            const InvoiceModel = require('../models/Invoice');
            const existingInvoice = await InvoiceModel.findByJobId(jobId);
            if (existingInvoice) {
                await InvoiceModel.update(existingInvoice.id);
            }

            const existing = await JobModel.findById(jobId);
            if (existing && (existing.status === 'completed' || existing.final_cost)) {
                const partsRow = await db.queryOne('SELECT COALESCE(SUM(quantity_used * unit_price_at_time), 0) as total FROM job_parts WHERE job_id = ?', [jobId]);
                const partsTotal = parseFloat(partsRow?.total || 0);
                const laborTotal = existingInvoice ? parseFloat(existingInvoice.labor_total || 0) : Math.max(0, (existing.estimated_cost || 0));
                const taxRate = existingInvoice ? parseFloat(existingInvoice.tax_rate || 0.10) : 0.10;
                const newFinalCost = (laborTotal + partsTotal) * (1 + taxRate);
                await JobModel.update(jobId, { final_cost: newFinalCost });
            }

            await AuditModel.log({ 
                user_id: req.user.id, 
                action: 'DELETE_PART', 
                entity: 'jobs', 
                entity_id: parseInt(jobId), 
                details: `Removed part ID #${jobPart.part_id} from job`, 
                ip_address: req.ip 
            });

            const updatedParts = await JobModel.getParts(jobId);
            res.json({ message: 'Part removed from job', parts: updatedParts });
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
