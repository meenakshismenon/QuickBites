const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const FoodItem = require('../models/FoodItem');

// 1. GET /api/reviews/food/:foodId - Get reviews for a specific dish (Read)
router.get('/food/:foodId', async (req, res) => {
  try {
    const reviews = await Review.find({ foodItem: req.params.foodId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST /api/reviews - Add customer review and update food rating (Create)
router.post('/', async (req, res) => {
  try {
    const { customerName, foodItem, rating, comment } = req.body;

    if (!customerName || !foodItem || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, foodItem ID, and rating (1-5) are required',
      });
    }

    const food = await FoodItem.findById(foodItem);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    const review = await Review.create({
      customerName: customerName.trim(),
      foodItem,
      rating: Number(rating),
      comment: comment ? comment.trim() : '',
    });

    // Recalculate average rating
    const allReviews = await Review.find({ foodItem });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    food.rating = Number(avgRating.toFixed(1));
    food.ratingCount = allReviews.length;
    await food.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully! Thank you for your feedback.',
      data: review,
      updatedFoodRating: food.rating,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. DELETE /api/reviews/:id - Delete a review (Delete)
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
