const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');

router.use(authenticate);

router.get('/stats', jobController.getStats);
router.get('/', jobController.getAll);
router.get('/:id', jobController.getById);

// Admin can create/delete/assign jobs
router.post('/', authorize('admin'), [
    body('customer_id').isInt(),
    body('device_name').notEmpty(),
    body('problem_description').notEmpty(),
], validate, jobController.create);

router.put('/:id', authorize('admin'), validate, jobController.update);
router.delete('/:id', authorize('admin'), jobController.delete);

// Status updates (both admin and employee)
router.patch('/:id/status', [
    body('status').isIn(['pending', 'assigned', 'in_progress', 'waiting_parts', 'done_pending_verification', 'completed', 'delivered'])
], validate, jobController.updateStatus);

// Admin-only: Verify (approve/reject) a job marked as done
router.patch('/:id/verify', authorize('admin'), [
    body('action').isIn(['approve', 'reject']),
    body('note').optional().isString(),
    body('service_price').optional().isFloat({ min: 0 }),
    body('labor_total').optional().isFloat({ min: 0 }),
    body('tax_rate').optional().isFloat({ min: 0, max: 1 })
], validate, jobController.verifyJob);

// Notes (both admin and employee)
router.post('/:id/notes', [
    body('description').notEmpty()
], validate, jobController.addNote);

// Parts (both admin and technicians can attach/remove parts used during repair)
router.post('/:id/parts', [
    body('part_id').isInt(),
    body('quantity_used').optional().isInt({ min: 1 }),
    body('unit_price_at_time').optional().isFloat({ min: 0 })
], validate, jobController.addPart);
router.delete('/:id/parts/:partId', jobController.deletePart);

module.exports = router;
