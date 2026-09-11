const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    method: { type: String, default: 'mock-card' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
