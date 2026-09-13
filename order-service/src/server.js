require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/orders', orderRoutes);

app.get('/health', (req, res) => res.json({ status: 'order-service is up' }));

const PORT = process.env.PORT || 5003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/order-service';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Order Service: connected to MongoDB');
    app.listen(PORT, () => console.log(`Order Service running on port ${PORT}`));
  })
  .catch((err) => console.error('Order Service: MongoDB connection error', err));
