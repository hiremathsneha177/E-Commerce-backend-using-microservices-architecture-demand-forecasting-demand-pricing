const Payment = require('../models/Payment');

// Simulates a real payment gateway (like Stripe/Razorpay would work).
// 95% of payments succeed, 5% randomly fail, so the order-service's
// error-handling path can actually be demonstrated/tested.
exports.processPayment = async (req, res) => {
  try {
    const { orderId, amount, userId } = req.body;

    if (!orderId || !amount || !userId) {
      return res.status(400).json({ message: 'orderId, amount and userId are required' });
    }

    const isSuccess = Math.random() > 0.05;

    const payment = await Payment.create({
      orderId,
      userId,
      amount,
      status: isSuccess ? 'success' : 'failed',
    });

    res.status(201).json({
      message: isSuccess ? 'Payment successful' : 'Payment failed',
      paymentId: payment._id,
      status: payment.status,
    });
  } catch (err) {
    res.status(500).json({ message: 'Payment processing error', error: err.message });
  }
};

exports.getPaymentByOrderId = async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment', error: err.message });
  }
};
