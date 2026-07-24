import express from 'express';
import Recipe from '../models/Recipe.js';
import auth from '../middleware/auth.js';

const router = express.Router();

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', auth, async (req, res) => {
  try {
    const { mealType, tag, search } = req.query;
    const filter = {};
    if (mealType && mealType !== 'todos') filter.mealType = mealType;
    if (tag) filter.tags = tag;
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } }
      ];
    }
    const recipes = await Recipe.find(filter).sort({ createdAt: -1 });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Receta no encontrada' });
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const calcTotalCalories = (ingredients) => {
  if (!ingredients || !Array.isArray(ingredients)) return 0;
  return ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
};

router.post('/', auth, async (req, res) => {
  try {
    if (!req.body.name || !req.body.instructions) {
      return res.status(400).json({ message: 'Nombre e instrucciones son requeridos' });
    }
    const data = { ...req.body, createdBy: req.user._id };
    if (data.ingredients) {
      if (!Array.isArray(data.ingredients)) {
        return res.status(400).json({ message: 'Ingredientes debe ser un array' });
      }
      data.calories = data.calories || calcTotalCalories(data.ingredients);
    }
    const recipe = await Recipe.create(data);
    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.ingredients) {
      if (!Array.isArray(data.ingredients)) {
        return res.status(400).json({ message: 'Ingredientes debe ser un array' });
      }
      data.calories = data.calories || calcTotalCalories(data.ingredients);
    }
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!recipe) return res.status(404).json({ message: 'Receta no encontrada' });
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Receta no encontrada' });
    res.json({ message: 'Receta eliminada' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
