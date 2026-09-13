const express = require('express');
const router = express.Router();
const { processPayment, getPaymentByOrderId } = require('../controllers/paymentController');

router.post('/', processPayment);
router.get('/order/:orderId', getPaymentByOrderId);

module.exports = router;
