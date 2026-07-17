const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');

// Admin only routes for managing users
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', userController.getAll);
router.get('/:id', userController.getById);

router.post('/', [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('role').isIn(['admin', 'employee']).withMessage('Invalid role'),
], validate, userController.create);

router.put('/:id', [
    body('email').optional().isEmail(),
    body('role').optional().isIn(['admin', 'employee']),
], validate, userController.update);

router.delete('/:id', userController.delete);

module.exports = router;
