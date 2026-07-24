import express from 'express';
import MealPlan from '../models/MealPlan.js';
import User from '../models/User.js';
import House from '../models/House.js';
import Recipe from '../models/Recipe.js';
import auth from '../middleware/auth.js';
import { sendMealNotification } from '../utils/mailer.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = req.user.house ? { house: req.user.house } : { house: null };
    if (start && end) {
      filter.date = { $gte: new Date(start), $lte: new Date(end) };
    }
    const plans = await MealPlan.find(filter)
      .populate('desayuno almuerzo merienda cena')
      .lean();

    const formatted = plans.map(p => ({
      ...p,
      date: p.date.toISOString().split('T')[0]
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:date', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const filter = req.user.house ? { date, house: req.user.house } : { date, house: null };
    const plan = await MealPlan.findOne(filter).populate('desayuno almuerzo merienda cena');
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { date, desayuno, almuerzo, merienda, cena } = req.body;
    const filter = req.user.house
      ? { date: new Date(date), house: req.user.house }
      : { date: new Date(date) };
    const plan = await MealPlan.findOneAndUpdate(
      filter,
      { desayuno, almuerzo, merienda, cena, updatedBy: req.user._id, ...(req.user.house ? { house: req.user.house } : {}) },
      { upsert: true, new: true }
    ).populate('desayuno almuerzo merienda cena');
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:date', auth, async (req, res) => {
  try {
    const { mealType, recipeId } = req.body;
    const filter = req.user.house
      ? { date: new Date(req.params.date), house: req.user.house }
      : { date: new Date(req.params.date) };
    const update = {
      [mealType]: recipeId || null,
      updatedBy: req.user._id,
      ...(req.user.house ? { house: req.user.house } : {})
    };
    const plan = await MealPlan.findOneAndUpdate(
      filter,
      update,
      { upsert: true, new: true }
    ).populate('desayuno almuerzo merienda cena');

    if (recipeId && req.user.house) {
      const [recipe, house] = await Promise.all([
        Recipe.findById(recipeId),
        House.findById(req.user.house).populate('members', 'email name')
      ]);
      if (recipe && house?.members) {
        const date = req.params.date;
        const assignedByName = req.user.name || req.user.email;
        for (const member of house.members) {
          if (member._id.toString() !== req.user._id.toString()) {
            sendMealNotification({
              to: member.email,
              recipeName: recipe.name,
              mealType,
              date,
              assignedByName,
              houseName: house.name,
            });
          }
        }
      }
    }

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
