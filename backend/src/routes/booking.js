const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// Public routes — no auth required
router.get('/salon/:slug', bookingController.getSalonInfo);
router.get('/salon/:slug/services', bookingController.getServices);
router.get('/salon/:slug/staff', bookingController.getStaff);
router.get('/salon/:slug/availability', bookingController.getAvailability);
router.post('/salon/:slug/create-deposit-intent', bookingController.createDepositIntent);
router.post('/salon/:slug/reserve', bookingController.createReservation);
router.post('/salon/:slug/cancel/:token', bookingController.cancelReservation);
router.get('/confirm/:token', bookingController.confirmReservation);

module.exports = router;
