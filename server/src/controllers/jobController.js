const JobModel = require('../models/Job');
const JobNoteModel = require('../models/JobNote');
const AuditModel = require('../models/Audit');

const jobController = {
    getAll(req, res, next) {
        try {
            const { status, search } = req.query;
            const jobs = JobModel.findAll(search, status);
            res.json(jobs);
        } catch (error) { next(error); }
    },

    getById(req, res, next) {
        try {
            const job = JobModel.findById(req.params.id);
            if (!job) return res.status(404).json({ error: 'Job not found' });
            
            const parts = JobModel.getParts(req.params.id);
            const notes = JobNoteModel.findByJobId(req.params.id);
            
            res.json({ ...job, parts, notes });
        } catch (error) { next(error); }
    },

    create(req, res, next) {
        try {
            const jobData = { ...req.body, created_by: req.user.id };
            const job = JobModel.create(jobData);
            AuditModel.log({ user_id: req.user.id, action: 'CREATE', entity: 'jobs', entity_id: job.id, ip_address: req.ip });
            res.status(201).json(job);
        } catch (error) { next(error); }
    },

    update(req, res, next) {
        try {
            const existing = JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });
            
            const job = JobModel.update(req.params.id, req.body);
            AuditModel.log({ user_id: req.user.id, action: 'UPDATE', entity: 'jobs', entity_id: job.id, ip_address: req.ip });
            res.json(job);
        } catch (error) { next(error); }
    },

    updateStatus(req, res, next) {
        try {
            const existing = JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });
            
            const job = JobModel.update(req.params.id, { status: req.body.status });
            AuditModel.log({ user_id: req.user.id, action: 'STATUS_CHANGE', entity: 'jobs', entity_id: job.id, details: `Status: ${req.body.status}`, ip_address: req.ip });
            res.json(job);
        } catch (error) { next(error); }
    },

    delete(req, res, next) {
        try {
            const existing = JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });
            
            JobModel.delete(req.params.id);
            AuditModel.log({ user_id: req.user.id, action: 'DELETE', entity: 'jobs', entity_id: parseInt(req.params.id), ip_address: req.ip });
            res.json({ message: 'Job deleted successfully' });
        } catch (error) { next(error); }
    },

    // Notes
    addNote(req, res, next) {
        try {
            const existing = JobModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Job not found' });
            
            const note = JobNoteModel.create({
                job_id: req.params.id,
                employee_id: req.user.id,
                description: req.body.description
            });
            AuditModel.log({ user_id: req.user.id, action: 'ADD_NOTE', entity: 'jobs', entity_id: existing.id, ip_address: req.ip });
            res.status(201).json(note);
        } catch (error) { next(error); }
    },

    // Parts
    addPart(req, res, next) {
        try {
            JobModel.addPart(req.params.id, req.body.part_id, req.body.quantity_used, req.body.unit_price_at_time);
            res.status(201).json({ message: 'Part added' });
        } catch (error) { next(error); }
    },

    deletePart(req, res, next) {
        try {
            JobModel.removePart(req.params.partId);
            res.json({ message: 'Part removed from job' });
        } catch (error) { next(error); }
    },

    // Dashboard stats
    getStats(req, res, next) {
        try {
            const stats = JobModel.getStats();
            res.json(stats);
        } catch (error) { next(error); }
    },
};

module.exports = jobController;
