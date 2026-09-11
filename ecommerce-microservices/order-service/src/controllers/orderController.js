const axios = require('axios');
const Order = require('../models/Order');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004';

// Creates an order: validates stock with product-service, reduces stock,
// then kicks off a payment with payment-service. This is the core
// "service-to-service communication" piece of the project.
exports.createOrder = async (req, res) => {
  const { items, shippingAddress } = req.body;
  const userId = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain at least one item' });
  }

  try {
    let totalAmount = 0;
    const validatedItems = [];

    // 1. Validate each item against product-service and reduce stock
    for (const item of items) {
      const { data: product } = await axios.get(
        `${PRODUCT_SERVICE_URL}/api/products/${item.productId}`
      );

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      await axios.patch(
        `${PRODUCT_SERVICE_URL}/api/products/${item.productId}/reduce-stock`,
        { quantity: item.quantity }
      );

      totalAmount += product.price * item.quantity;
      validatedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    // 2. Create the order record (status: pending)
    const order = await Order.create({
      userId,
      items: validatedItems,
      totalAmount,
      shippingAddress,
    });

    // 3. Kick off payment via payment-service
    const { data: payment } = await axios.post(`${PAYMENT_SERVICE_URL}/api/payments`, {
      orderId: order._id,
      amount: totalAmount,
      userId,
    });

    order.paymentId = payment.paymentId;
    order.status = payment.status === 'success' ? 'paid' : 'pending';
    await order.save();

    res.status(201).json({ message: 'Order created', order });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    res.status(500).json({ message: 'Failed to create order', error: msg });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order', error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order', error: err.message });
  }
};
