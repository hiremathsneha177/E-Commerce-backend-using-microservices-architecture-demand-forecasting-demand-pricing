require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const productRoutes = require('./routes/productRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/products', productRoutes);

app.get('/health', (req, res) => res.json({ status: 'product-service is up' }));

const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/product-service';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Product Service: connected to MongoDB');
    app.listen(PORT, () => console.log(`Product Service running on port ${PORT}`));
  })
  .catch((err) => console.error('Product Service: MongoDB connection error', err));
