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
    body('status').isIn(['pending', 'assigned', 'in_progress', 'waiting_parts', 'completed', 'delivered'])
], validate, jobController.updateStatus);

// Notes (both admin and employee)
router.post('/:id/notes', [
    body('description').notEmpty()
], validate, jobController.addNote);

// Parts (Admin only for modifying job parts)
router.post('/:id/parts', authorize('admin'), [
    body('part_id').isInt(),
    body('quantity_used').isInt({ min: 1 })
], validate, jobController.addPart);
router.delete('/:id/parts/:partId', authorize('admin'), jobController.deletePart);

module.exports = router;
