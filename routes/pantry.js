import express from 'express';
import PantryItem from '../models/PantryItem.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = req.user.house ? { house: req.user.house } : { user: req.user._id };
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const items = await PantryItem.find(filter).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, amount, unit, category, expiryDate, notes, caloriesPer100g } = req.body;
    const scope = req.user.house ? { house: req.user.house } : { user: req.user._id };
    const key = req.user.house ? { house: req.user.house } : { user: req.user._id };
    const existing = await PantryItem.findOne({ ...key, name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) {
      existing.amount = (existing.amount || 0) + (amount || 0);
      if (unit) existing.unit = unit;
      if (category) existing.category = category;
      if (caloriesPer100g) existing.caloriesPer100g = caloriesPer100g;
      if (expiryDate) existing.expiryDate = expiryDate;
      if (notes) existing.notes = notes;
      await existing.save();
      return res.json(existing);
    }
    const data = { ...req.body, ...scope };
    if (!data.house) data.user = req.user._id;
    const item = await PantryItem.create(data);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const scope = req.user.house ? { house: req.user.house } : { user: req.user._id };
    const item = await PantryItem.findOneAndUpdate(
      { _id: req.params.id, ...scope },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Ingrediente no encontrado' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const scope = req.user.house ? { house: req.user.house } : { user: req.user._id };
    const item = await PantryItem.findOneAndDelete({ _id: req.params.id, ...scope });
    if (!item) return res.status(404).json({ message: 'Ingrediente no encontrado' });
    res.json({ message: 'Ingrediente eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    const scope = req.user.house ? { house: req.user.house } : { user: req.user._id };
    await PantryItem.deleteMany({ _id: { $in: ids }, ...scope });
    res.json({ message: 'Ingredientes eliminados' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
