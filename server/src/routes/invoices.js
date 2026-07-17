const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

const router = express.Router();

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Get all invoices
 *     tags: [Invoices]
 *     responses:
 *       200:
 *         description: List of invoices
 */
router.get('/', authenticate, invoiceController.getAll);

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Invoice details
 */
router.get('/:id', authenticate, invoiceController.getById);

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Create an invoice for a job (auto-calculates totals)
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [job_id]
 *             properties:
 *               job_id: { type: integer }
 *               tax_rate: { type: number, default: 0.10 }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Invoice created
 */
router.post('/', authenticate, authorize('admin'), [
    body('job_id').isInt().withMessage('Job ID is required'),
    validate,
], invoiceController.create);

/**
 * @swagger
 * /api/invoices/{id}:
 *   put:
 *     summary: Update invoice (payment status)
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Invoice updated
 */
router.put('/:id', authenticate, authorize('admin'), invoiceController.update);

/**
 * @swagger
 * /api/invoices/{id}:
 *   delete:
 *     summary: Delete an invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Invoice deleted
 */
router.delete('/:id', authenticate, authorize('admin'), invoiceController.delete);

module.exports = router;
