const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// 1. GET /api/orders - List all orders with optional status filter (Read)
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ customerName: regex }, { customerPhone: regex }, { deliveryAddress: regex }];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/orders/:id - Get single order with live tracking status (Read)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/orders - Place a new food order (Create)
router.post('/', async (req, res) => {
  try {
    const { customerName, customerPhone, deliveryAddress, items, paymentMethod, orderNotes } = req.body;

    if (!customerName || !customerPhone || !deliveryAddress || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, phone, delivery address, and at least one item are required',
      });
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);
    const deliveryFee = 30;
    const totalAmount = subtotal + deliveryFee;

    const newOrder = await Order.create({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod: paymentMethod || 'Cash on Delivery',
      orderNotes: orderNotes ? orderNotes.trim() : '',
      status: 'Placed',
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Preparing your delicious meal.',
      data: newOrder,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. PATCH /api/orders/:id/status - Update order tracking status (Update)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to '${status}'`,
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. DELETE /api/orders/:id - Cancel or delete an order (Delete)
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      message: `Order #${order._id.toString().slice(-6)} cancelled and removed successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
