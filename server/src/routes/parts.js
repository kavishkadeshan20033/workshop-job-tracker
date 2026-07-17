const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const partController = require('../controllers/partController');

const router = express.Router();

/**
 * @swagger
 * /api/parts:
 *   get:
 *     summary: Get all parts
 *     tags: [Parts]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of parts
 */
router.get('/', authenticate, partController.getAll);

/**
 * @swagger
 * /api/parts/low-stock:
 *   get:
 *     summary: Get parts with low stock
 *     tags: [Parts]
 *     responses:
 *       200:
 *         description: Low stock parts
 */
router.get('/low-stock', authenticate, partController.getLowStock);

/**
 * @swagger
 * /api/parts/{id}:
 *   get:
 *     summary: Get part by ID
 *     tags: [Parts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Part details
 */
router.get('/:id', authenticate, partController.getById);

/**
 * @swagger
 * /api/parts:
 *   post:
 *     summary: Create a new part (admin only)
 *     tags: [Parts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, unit_price]
 *             properties:
 *               name: { type: string }
 *               part_number: { type: string }
 *               stock_qty: { type: integer }
 *               unit_price: { type: number }
 *               reorder_level: { type: integer }
 *               category: { type: string }
 *     responses:
 *       201:
 *         description: Part created
 */
router.post('/', authenticate, authorize('admin'), [
    body('name').trim().notEmpty().withMessage('Part name is required'),
    body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    validate,
], partController.create);

/**
 * @swagger
 * /api/parts/{id}:
 *   put:
 *     summary: Update a part (admin only)
 *     tags: [Parts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Part updated
 */
router.put('/:id', authenticate, authorize('admin'), partController.update);

/**
 * @swagger
 * /api/parts/{id}:
 *   delete:
 *     summary: Delete a part (admin only)
 *     tags: [Parts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Part deleted
 */
router.delete('/:id', authenticate, authorize('admin'), partController.delete);

module.exports = router;
