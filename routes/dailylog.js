import express from 'express';
import DailyLog from '../models/DailyLog.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = {};
    if (req.query.userId) {
      filter.user = req.query.userId;
    } else {
      filter.user = req.user._id;
    }
    if (start && end) {
      filter.date = { $gte: new Date(start), $lte: new Date(end) };
    }
    const logs = await DailyLog.find(filter).sort({ date: -1 });
    const formatted = logs.map(l => ({
      ...l.toObject(),
      date: l.date.toISOString().split('T')[0]
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:date', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const log = await DailyLog.findOne({ date, user: req.user._id });
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { date, comidas, actividadFisica, entrenamiento, notas, humor, agua } = req.body;
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(date), user: req.user._id },
      { comidas, actividadFisica, entrenamiento, notas, humor, agua },
      { upsert: true, new: true }
    );
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:date/check-meal', auth, async (req, res) => {
  try {
    const { mealType, checked } = req.body;
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(req.params.date), user: req.user._id },
      { [`comidas.${mealType}`]: checked },
      { upsert: true, new: true }
    );
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
