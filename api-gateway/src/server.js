require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:5003';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5005';

// Every request to /api/auth/* is forwarded to auth-service, and so on.
// This is the classic "API Gateway" pattern: clients only ever talk to
// one host/port, and don't need to know how the backend is split up.
app.use('/api/auth', createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }));
app.use('/api/products', createProxyMiddleware({ target: PRODUCT_SERVICE_URL, changeOrigin: true }));
app.use('/api/orders', createProxyMiddleware({ target: ORDER_SERVICE_URL, changeOrigin: true }));
app.use('/api/payments', createProxyMiddleware({ target: PAYMENT_SERVICE_URL, changeOrigin: true }));
app.use('/api/recommendations', createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));
app.use('/api/forecast', createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));
app.use('/api/pricing', createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));

app.get('/health', (req, res) => res.json({ status: 'api-gateway is up' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
