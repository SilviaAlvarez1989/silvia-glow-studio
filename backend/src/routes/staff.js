const express = require('express');
const router = express.Router();
const { getStaff, createStaff, updateStaff } = require('../controllers/staffController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', getStaff);
router.post('/', requireRole('admin', 'manager'), createStaff);
router.patch('/:id', requireRole('admin', 'manager'), updateStaff);

module.exports = router;
