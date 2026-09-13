require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => res.json({ status: 'auth-service is up' }));

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth-service';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Auth Service: connected to MongoDB');
    app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
  })
  .catch((err) => console.error('Auth Service: MongoDB connection error', err));
