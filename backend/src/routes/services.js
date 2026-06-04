const express = require('express');
const router = express.Router();
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', getServices);
router.post('/', requireRole('admin', 'manager'), createService);
router.patch('/:id', requireRole('admin', 'manager'), updateService);
router.delete('/:id', requireRole('admin', 'manager'), deleteService);

module.exports = router;
