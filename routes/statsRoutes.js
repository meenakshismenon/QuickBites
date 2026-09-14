const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const FoodItem = require('../models/FoodItem');
const Order = require('../models/Order');
const Review = require('../models/Review');

// 1. GET /api/stats - Business & Menu Overview Metrics (Read)
router.get('/', async (req, res) => {
  try {
    const totalDishes = await FoodItem.countDocuments();
    const availableDishes = await FoodItem.countDocuments({ isAvailable: true });
    const totalOrders = await Order.countDocuments();

    // Calculate revenue
    const revenueAgg = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    // Order status counts
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Popular categories count
    const categoryStats = await FoodItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDishes,
        availableDishes,
        totalOrders,
        totalRevenue,
        statusCounts,
        categoryStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/health - Server and Database Health Status (Read)
router.get('/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    status: 'online',
    uptime: Math.floor(process.uptime()),
    database: {
      status: isConnected ? 'Connected' : 'Disconnected',
      name: mongoose.connection.name || 'quickbite_db',
    },
    timestamp: new Date().toISOString(),
  });
});

// 3. POST /api/seed - Seed delicious food menu items & sample orders (Create)
router.post('/seed', async (req, res) => {
  try {
    // Clear existing collections
    await FoodItem.deleteMany({});
    await Order.deleteMany({});
    await Review.deleteMany({});

    const sampleFoods = [
      {
        name: 'Artisan Margherita Pizza',
        description: 'San Marzano tomato sauce, fresh mozzarella Fior di Latte, basil leaves, and extra virgin olive oil.',
        price: 349,
        category: 'Pizza',
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=80',
        isVeg: true,
        rating: 4.8,
        ratingCount: 38,
        preparationTime: '20 mins',
        isAvailable: true,
      },
      {
        name: 'Smoked Pepperoni Feast Pizza',
        description: 'Slow-cured spicy pepperoni slices, mozzarella, cracked black pepper, and oregano drizzle.',
        price: 499,
        category: 'Pizza',
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80',
        isVeg: false,
        rating: 4.9,
        ratingCount: 52,
        preparationTime: '25 mins',
        isAvailable: true,
      },
      {
        name: 'Truffle Mushroom Burger',
        description: 'Crispy portobello patty, caramelized onions, melted Swiss cheese, and aromatic black truffle aioli.',
        price: 289,
        category: 'Burgers',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
        isVeg: true,
        rating: 4.7,
        ratingCount: 29,
        preparationTime: '15 mins',
        isAvailable: true,
      },
      {
        name: 'Crispy Fried Chicken Burger',
        description: 'Buttermilk soaked crunchy chicken thigh, creamy coleslaw, dill pickles, and house secret spicy mayo.',
        price: 319,
        category: 'Burgers',
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
        isVeg: false,
        rating: 4.8,
        ratingCount: 64,
        preparationTime: '18 mins',
        isAvailable: true,
      },
      {
        name: 'Hyderabadi Dum Biryani',
        description: 'Long grain aged Basmati rice layered with spiced paneer cubes, saffron, fried onions, and served with salan.',
        price: 329,
        category: 'Biryani',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
        isVeg: true,
        rating: 4.9,
        ratingCount: 88,
        preparationTime: '25 mins',
        isAvailable: true,
      },
      {
        name: 'Pad Thai Wok Noodles',
        description: 'Flat rice noodles tossed in tangy tamarind sauce with crunchy sprouts, tofu, crushed roasted peanuts, and lime.',
        price: 279,
        category: 'Asian',
        image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=80',
        isVeg: true,
        rating: 4.6,
        ratingCount: 24,
        preparationTime: '15 mins',
        isAvailable: true,
      },
      {
        name: 'Dark Chocolate Molten Lava Cake',
        description: 'Warm, decadent Belgian dark chocolate cake with an oozing liquid ganache core.',
        price: 199,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
        isVeg: true,
        rating: 4.9,
        ratingCount: 75,
        preparationTime: '10 mins',
        isAvailable: true,
      },
      {
        name: 'Fresh Mint & Lime Mojito',
        description: 'Muddled fresh mint sprigs, lime wedges, pure cane sugar syrup, and crisp sparkling soda.',
        price: 149,
        category: 'Beverages',
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
        isVeg: true,
        rating: 4.7,
        ratingCount: 31,
        preparationTime: '5 mins',
        isAvailable: true,
      },
    ];

    const createdFoods = await FoodItem.insertMany(sampleFoods);

    // Seed Sample Orders
    const sampleOrders = [
      {
        customerName: 'Ananya Sharma',
        customerPhone: '+91 98765 43210',
        deliveryAddress: 'Flat 402, Green Glen Towers, Bellandur, Bangalore',
        items: [
          { foodItem: createdFoods[0]._id, name: createdFoods[0].name, price: createdFoods[0].price, quantity: 1 },
          { foodItem: createdFoods[7]._id, name: createdFoods[7].name, price: createdFoods[7].price, quantity: 2 },
        ],
        subtotal: 647,
        deliveryFee: 30,
        totalAmount: 677,
        status: 'Out for Delivery',
        paymentMethod: 'UPI / Online',
        orderNotes: 'Please ring bell twice',
      },
      {
        customerName: 'Rahul Verma',
        customerPhone: '+91 98765 12345',
        deliveryAddress: 'B-12, Palm Meadows, Whitefield, Bangalore',
        items: [
          { foodItem: createdFoods[1]._id, name: createdFoods[1].name, price: createdFoods[1].price, quantity: 1 },
          { foodItem: createdFoods[6]._id, name: createdFoods[6].name, price: createdFoods[6].price, quantity: 1 },
        ],
        subtotal: 698,
        deliveryFee: 30,
        totalAmount: 728,
        status: 'Preparing',
        paymentMethod: 'Cash on Delivery',
      },
    ];

    const createdOrders = await Order.insertMany(sampleOrders);

    res.status(200).json({
      success: true,
      message: 'QuickBite demo menu & sample orders seeded successfully!',
      counts: {
        dishes: createdFoods.length,
        orders: createdOrders.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
