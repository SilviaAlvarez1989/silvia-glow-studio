const express = require('express');
const router = express.Router();
const { getDashboard, getRevenue } = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', getDashboard);
router.get('/revenue', getRevenue);

module.exports = router;
