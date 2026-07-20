const express = require('express');
const { query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

/**
 * @swagger
 * /api/reports/daily:
 *   get:
 *     summary: Get daily job report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Daily report with summary and job list
 */
router.get('/daily', [
    authenticate,
    query('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date is required (YYYY-MM-DD)'),
    validate
], reportController.getDailyReport);

/**
 * @swagger
 * /api/reports/monthly:
 *   get:
 *     summary: Get monthly job report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *     responses:
 *       200:
 *         description: Monthly report with summary and job list
 */
router.get('/monthly', [
    authenticate,
    query('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required (1-12)'),
    validate
], reportController.getMonthlyReport);

module.exports = router;
