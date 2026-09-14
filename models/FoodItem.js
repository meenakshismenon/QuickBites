const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Food item name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Pizza', 'Burgers', 'Asian', 'Biryani', 'Desserts', 'Beverages', 'Sides'],
      default: 'Pizza',
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 1,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 12,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    preparationTime: {
      type: String,
      default: '20-25 mins',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FoodItem', foodItemSchema);
