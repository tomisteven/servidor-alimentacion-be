import express from 'express';
import House from '../models/House.js';
import User from '../models/User.js';
import DailyLog from '../models/DailyLog.js';
import auth from '../middleware/auth.js';

const SCORE_PER_MEAL = 10;
const SCORE_BONUS_ALL_MEALS = 10;

function getMealCalories(meal) {
  if (!meal || typeof meal === 'boolean') return 0;
  if (Array.isArray(meal)) return meal.reduce((s, m) => s + ((m?.calories || 0)), 0);
  return meal.calories || 0;
}

function normalizeMealScore(val) {
  if (!val || typeof val === 'boolean') return { checked: !!val };
  if (Array.isArray(val)) return { checked: val.some(v => v?.checked), name: '', calories: val.reduce((s, v) => s + (v?.calories || 0), 0) };
  return { checked: val.checked || false, name: val.name || '', calories: val.calories || 0 };
}

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const houses = await House.find({ members: req.user._id }).populate('members', 'name email');
    res.json(houses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre de la casa es requerido' });

    const house = await House.create({
      name,
      members: [req.user._id],
      createdBy: req.user._id
    });

    const user = await User.findById(req.user._id);
    if (!user.house) {
      user.house = house._id;
      await user.save();
    }

    res.status(201).json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: 'Casa no encontrada' });
    if (house.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Ya eres miembro de esta casa' });
    }
    house.members.push(req.user._id);
    await house.save();
    res.json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: 'Casa no encontrada' });
    if (!house.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'No eres miembro de esta casa' });
    }
    const invited = await User.findOne({ email });
    if (!invited) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (house.members.includes(invited._id)) {
      return res.status(400).json({ message: 'Ya es miembro de esta casa' });
    }
    house.members.push(invited._id);
    await house.save();
    invited.house = house._id;
    await invited.save();
    res.json({ message: 'Usuario agregado a la casa', house });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/switch/:id', auth, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: 'Casa no encontrada' });
    if (!house.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'No eres miembro de esta casa' });
    }
    req.user.house = house._id;
    await req.user.save();
    const populated = await User.findById(req.user._id).select('-password').populate('house');
    res.json({ message: `Cambiaste a ${house.name}`, user: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/current', auth, async (req, res) => {
  try {
    if (!req.user.house) return res.json(null);
    const house = await House.findById(req.user.house).populate('members', 'name email');
    if (!house) return res.json(null);
    res.json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: 'Casa no encontrada' });
    if (house.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Solo el creador puede eliminar miembros' });
    }
    const memberIdx = house.members.findIndex(m => m.toString() === req.params.userId);
    if (memberIdx === -1) return res.status(404).json({ message: 'Miembro no encontrado' });
    const removedId = house.members[memberIdx];
    house.members.splice(memberIdx, 1);
    await house.save();
    await User.findByIdAndUpdate(removedId, { $unset: { house: '' } });
    res.json({ message: 'Miembro eliminado', house });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/leaderboard', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const house = await House.findById(req.params.id).populate('members', 'name email');
    if (!house) return res.status(404).json({ message: 'Casa no encontrada' });
    if (!house.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'No eres miembro de esta casa' });
    }

    const dateFilter = {};
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      e.setHours(23, 59, 59, 999);
      dateFilter.date = { $gte: s, $lte: e };
    } else {
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek + 1));
      const sunday = new Date(monday);
      sunday.setUTCDate(sunday.getUTCDate() + 6);
      sunday.setUTCHours(23, 59, 59, 999);
      dateFilter.date = { $gte: monday, $lte: sunday };
    }

    const leaderboard = await Promise.all(house.members.map(async (member) => {
      const logs = await DailyLog.find({ user: member._id, ...dateFilter }).lean();

      let totalMeals = 0;
      let totalCalories = 0;
      let daysWithAllMeals = 0;

      logs.forEach(log => {
        const meals = ['desayuno', 'almuerzo', 'merienda', 'cena'];
        let dayMeals = 0;
        meals.forEach(mt => {
          const meal = normalizeMealScore(log.comidas?.[mt]);
          if (meal.checked) {
            totalMeals++;
            dayMeals++;
            totalCalories += getMealCalories(log.comidas?.[mt]);
          }
        });
        const colaciones = log.comidas?.colacion;
        if (Array.isArray(colaciones)) {
          colaciones.forEach(c => {
            const m = normalizeMealScore(c);
            if (m.checked) {
              totalMeals++;
              totalCalories += getMealCalories(c);
            }
          });
        } else {
          const m = normalizeMealScore(colaciones);
          if (m.checked) {
            totalMeals++;
            totalCalories += getMealCalories(colaciones);
          }
        }
        if (dayMeals === 4) daysWithAllMeals++;
      });

      const score = (totalMeals * SCORE_PER_MEAL) + (daysWithAllMeals * SCORE_BONUS_ALL_MEALS);

      return {
        userId: member._id,
        name: member.name,
        email: member.email,
        totalMeals,
        totalCalories,
        daysWithAllMeals,
        score
      };
    }));

    leaderboard.sort((a, b) => b.score - a.score);

    res.json({
      houseName: house.name,
      period: {
        start: dateFilter.date?.$gte || null,
        end: dateFilter.date?.$lte || null
      },
      members: leaderboard
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
