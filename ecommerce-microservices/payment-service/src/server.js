require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/payments', paymentRoutes);

app.get('/health', (req, res) => res.json({ status: 'payment-service is up' }));

const PORT = process.env.PORT || 5004;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/payment-service';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Payment Service: connected to MongoDB');
    app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));
  })
  .catch((err) => console.error('Payment Service: MongoDB connection error', err));
