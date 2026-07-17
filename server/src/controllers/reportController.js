const JobModel = require('../models/Job');

const reportController = {
    getDailyReport(req, res, next) {
        try {
            const { date } = req.query;
            if (!date) return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
            const jobs = JobModel.getDailyReport(date);
            const summary = {
                date,
                total_jobs: jobs.length,
                completed: jobs.filter(j => j.status === 'completed').length,
                in_progress: jobs.filter(j => j.status === 'in_progress').length,
                pending: jobs.filter(j => j.status === 'pending').length,
                total_revenue: jobs.reduce((sum, j) => sum + (j.estimated_cost || 0), 0),
            };
            res.json({ summary, jobs });
        } catch (error) { next(error); }
    },

    getMonthlyReport(req, res, next) {
        try {
            const { year, month } = req.query;
            if (!year || !month) return res.status(400).json({ error: 'Year and month parameters are required' });
            const jobs = JobModel.getMonthlyReport(year, month);
            const summary = {
                year: parseInt(year),
                month: parseInt(month),
                total_jobs: jobs.length,
                completed: jobs.filter(j => j.status === 'completed').length,
                in_progress: jobs.filter(j => j.status === 'in_progress').length,
                pending: jobs.filter(j => j.status === 'pending').length,
                cancelled: jobs.filter(j => j.status === 'cancelled').length,
                total_revenue: jobs.reduce((sum, j) => sum + (j.estimated_cost || 0), 0),
            };
            res.json({ summary, jobs });
        } catch (error) { next(error); }
    },
};

module.exports = reportController;
