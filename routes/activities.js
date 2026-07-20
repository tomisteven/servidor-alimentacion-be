import express from 'express';
import DailyLog from '../models/DailyLog.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { date, actividadFisica } = req.body;
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(date), user: req.user._id },
      { actividadFisica },
      { upsert: true, new: true }
    );
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:date', auth, async (req, res) => {
  try {
    const { realizada, tipo, duracionMinutos, intensidad } = req.body;
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(req.params.date), user: req.user._id },
      { actividadFisica: { realizada, tipo, duracionMinutos, intensidad } },
      { upsert: true, new: true }
    );
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
