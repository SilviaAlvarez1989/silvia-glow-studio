const express = require('express');
const router = express.Router();
const { getClients, getClient, createClient, updateClient } = require('../controllers/clientController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', getClients);
router.get('/:id', getClient);
router.post('/', createClient);
router.patch('/:id', updateClient);

module.exports = router;
