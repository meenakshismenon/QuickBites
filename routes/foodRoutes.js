const express = require('express');
const router = express.Router();
const FoodItem = require('../models/FoodItem');

// 1. GET /api/foods - List all food items with search, category & veg filters (Read)
router.get('/', async (req, res) => {
  try {
    const { search, category, vegOnly, availableOnly } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (vegOnly === 'true') {
      filter.isVeg = true;
    }
    if (availableOnly === 'true') {
      filter.isAvailable = true;
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { description: regex }, { category: regex }];
    }

    const foods = await FoodItem.find(filter).sort({ category: 1, name: 1 });
    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/foods/:id - Get single food item (Read)
router.get('/:id', async (req, res) => {
  try {
    const food = await FoodItem.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }
    res.status(200).json({ success: true, data: food });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/foods - Add a new dish to the menu (Create)
router.post('/', async (req, res) => {
  try {
    const { name, description, price, category, image, isVeg, preparationTime } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required',
      });
    }

    const newFood = await FoodItem.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: Number(price),
      category,
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      isVeg: isVeg === true || isVeg === 'true',
      preparationTime: preparationTime || '20-25 mins',
      isAvailable: true,
    });

    res.status(201).json({
      success: true,
      message: 'New dish added to menu successfully',
      data: newFood,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. PUT /api/foods/:id - Update food item details (Update)
router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, category, image, isVeg, preparationTime, isAvailable } = req.body;
    const updatePayload = {};

    if (name) updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description.trim();
    if (price !== undefined) updatePayload.price = Number(price);
    if (category) updatePayload.category = category;
    if (image) updatePayload.image = image;
    if (isVeg !== undefined) updatePayload.isVeg = isVeg === true || isVeg === 'true';
    if (preparationTime) updatePayload.preparationTime = preparationTime;
    if (isAvailable !== undefined) updatePayload.isAvailable = isAvailable === true || isAvailable === 'true';

    const updatedFood = await FoodItem.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!updatedFood) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Dish details updated successfully',
      data: updatedFood,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. PATCH /api/foods/:id/availability - Toggle food in-stock/out-of-stock (Update)
router.patch('/:id/availability', async (req, res) => {
  try {
    const food = await FoodItem.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    food.isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : !food.isAvailable;
    await food.save();

    res.status(200).json({
      success: true,
      message: `Dish '${food.name}' is now ${food.isAvailable ? 'In Stock' : 'Out of Stock'}`,
      data: food,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. DELETE /api/foods/:id - Remove food item from menu (Delete)
router.delete('/:id', async (req, res) => {
  try {
    const food = await FoodItem.findByIdAndDelete(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    res.status(200).json({
      success: true,
      message: `Dish '${food.name}' removed from menu successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
