const express = require('express');
const router = express.Router();
const {
  getAppointments, getAppointment, createAppointment,
  updateAppointment, cancelAppointment, getAvailability,
} = require('../controllers/appointmentController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/availability', getAvailability);
router.get('/', getAppointments);
router.get('/:id', getAppointment);
router.post('/', createAppointment);
router.patch('/:id', updateAppointment);
router.delete('/:id', cancelAppointment);

module.exports = router;
