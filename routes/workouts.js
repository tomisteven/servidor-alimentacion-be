import express from 'express';
import WorkoutPlan from '../models/WorkoutPlan.js';
import DailyLog from '../models/DailyLog.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/plans', auth, async (req, res) => {
  try {
    const { assignedTo } = req.query;
    const filter = {
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ]
    };
    if (assignedTo) filter.$or.push({ assignedTo });
    const plans = await WorkoutPlan.find(filter)
      .populate('days.exercises.exercise')
      .sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/plans/:id', auth, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findById(req.params.id)
      .populate('days.exercises.exercise');
    if (!plan) return res.status(404).json({ message: 'Rutina no encontrada' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/plans', auth, async (req, res) => {
  try {
    const plan = await WorkoutPlan.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/plans/:id', auth, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('days.exercises.exercise');
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/plans/:id', auth, async (req, res) => {
  try {
    await WorkoutPlan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rutina eliminada' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/log', auth, async (req, res) => {
  try {
    const { date, entrenamiento } = req.body;
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(date), user: req.user._id },
      { $set: { entrenamiento } },
      { upsert: true, new: true }
    ).populate('entrenamiento.ejercicios.exercise');
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/log/:date', auth, async (req, res) => {
  try {
    const log = await DailyLog.findOne({
      date: new Date(req.params.date),
      user: req.user._id
    }).populate('entrenamiento.ejercicios.exercise');
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/log/:date/complete-exercise', auth, async (req, res) => {
  try {
    const { exerciseIndex, completado } = req.body;
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(req.params.date), user: req.user._id },
      { $set: { [`entrenamiento.ejercicios.${exerciseIndex}.completado`]: completado } },
      { new: true }
    ).populate('entrenamiento.ejercicios.exercise');
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
