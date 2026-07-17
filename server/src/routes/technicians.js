const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');

router.use(authenticate);

router.get('/', technicianController.getAll);
router.get('/:id', technicianController.getById);

// Admin only for modifying technicians
router.post('/', authorize('admin'), [
    body('name').notEmpty().withMessage('Name is required'),
], validate, technicianController.create);

router.put('/:id', authorize('admin'), validate, technicianController.update);

router.delete('/:id', authorize('admin'), technicianController.delete);

module.exports = router;
