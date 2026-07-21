import express from 'express';
import DailyLog from '../models/DailyLog.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

function normalizeMeal(val) {
  if (!val || typeof val === 'boolean') {
    return { checked: !!val, name: '', recipe: null, calories: null, isCustom: false };
  }
  return {
    checked: val.checked || false,
    name: val.name || '',
    recipe: val.recipe || null,
    calories: val.calories ?? null,
    isCustom: val.isCustom || false
  };
}

function normalizeColaciones(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(normalizeMeal);
  return [normalizeMeal(val)];
}

function normalizeLog(log) {
  if (!log) return log;
  const obj = log.toObject ? log.toObject() : log;
  return {
    ...obj,
    comidas: {
      desayuno: normalizeMeal(obj.comidas?.desayuno),
      almuerzo: normalizeMeal(obj.comidas?.almuerzo),
      merienda: normalizeMeal(obj.comidas?.merienda),
      cena: normalizeMeal(obj.comidas?.cena),
      colacion: normalizeColaciones(obj.comidas?.colacion)
    }
  };
}

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
    const logs = await DailyLog.find(filter)
      .populate('comidas.desayuno.recipe comidas.almuerzo.recipe comidas.merienda.recipe comidas.cena.recipe comidas.colacion.recipe')
      .sort({ date: -1 });
    const formatted = logs.map(l => ({
      ...normalizeLog(l),
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
    const log = await DailyLog.findOne({ date, user: req.user._id })
      .populate('comidas.desayuno.recipe comidas.almuerzo.recipe comidas.merienda.recipe comidas.cena.recipe comidas.colacion.recipe');
    if (!log) return res.json(null);
    res.json(normalizeLog(log));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { date, comidas, actividadFisica, entrenamiento, notas, humor, agua } = req.body;
    const updateData = { actividadFisica, entrenamiento, notas, humor, agua };
    if (comidas) {
      updateData['comidas.desayuno'] = normalizeMeal(comidas.desayuno);
      updateData['comidas.almuerzo'] = normalizeMeal(comidas.almuerzo);
      updateData['comidas.merienda'] = normalizeMeal(comidas.merienda);
      updateData['comidas.cena'] = normalizeMeal(comidas.cena);
    }
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(date), user: req.user._id },
      { $set: updateData },
      { upsert: true, new: true }
    );
    res.status(201).json(normalizeLog(log));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:date/meal', auth, async (req, res) => {
  try {
    const { mealType, checked, name, calories, isCustom, recipe } = req.body;
    const VALID_TYPES = ['desayuno', 'almuerzo', 'merienda', 'cena'];
    if (!VALID_TYPES.includes(mealType)) {
      return res.status(400).json({ message: 'Tipo de comida inválido' });
    }
    const mealData = {
      checked: checked || false,
      name: name || '',
      recipe: recipe || null,
      calories: calories ?? null,
      isCustom: isCustom || false
    };
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(req.params.date), user: req.user._id },
      { [`comidas.${mealType}`]: mealData },
      { upsert: true, new: true }
    );
    res.json(normalizeLog(log));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:date/check-meal', auth, async (req, res) => {
  try {
    const { mealType, checked, name, calories, isCustom, recipe, targetUserId } = req.body;
    const VALID_TYPES = ['desayuno', 'almuerzo', 'merienda', 'cena', 'colacion'];
    if (!VALID_TYPES.includes(mealType)) {
      return res.status(400).json({ message: 'Tipo de comida inválido' });
    }
    let userId = req.user._id;

    if (targetUserId && targetUserId !== req.user._id.toString()) {
      const me = await User.findById(req.user._id);
      if (!me) return res.status(404).json({ message: 'Usuario no encontrado' });
      const target = await User.findById(targetUserId);
      if (!target) return res.status(404).json({ message: 'Usuario target no encontrado' });
      if (!me.house || !target.house || me.house.toString() !== target.house.toString()) {
        return res.status(403).json({ message: 'No compartes casa con este usuario' });
      }
      userId = targetUserId;
    }

    if (mealType !== 'colacion') {
      const existing = await DailyLog.findOne({ date: new Date(req.params.date), user: userId });
      const current = existing ? normalizeMeal(existing.comidas?.[mealType]) : { checked: false, name: '', recipe: null, calories: null, isCustom: false };

      const mealData = {
        checked: checked !== undefined ? checked : current.checked,
        name: name !== undefined ? name : current.name,
        recipe: recipe !== undefined ? recipe : current.recipe,
        calories: calories !== undefined ? calories : current.calories,
        isCustom: isCustom !== undefined ? isCustom : current.isCustom
      };

      const log = await DailyLog.findOneAndUpdate(
        { date: new Date(req.params.date), user: userId },
        { [`comidas.${mealType}`]: mealData },
        { upsert: true, new: true }
      );
      res.json(normalizeLog(log));
    } else {
      if (targetUserId && targetUserId !== req.user._id.toString()) {
        return res.status(400).json({ message: 'Usa /colacion/add para agregar colación a otro usuario' });
      }
      const entry = { checked: checked || false, name: name || '', recipe: recipe || null, calories: calories ?? null, isCustom: isCustom || false };
      const log = await DailyLog.findOneAndUpdate(
        { date: new Date(req.params.date), user: userId },
        { $push: { 'comidas.colacion': entry } },
        { upsert: true, new: true }
      ).populate('comidas.desayuno.recipe comidas.almuerzo.recipe comidas.merienda.recipe comidas.cena.recipe comidas.colacion.recipe');
      res.json(normalizeLog(log));
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:date/colacion/add', auth, async (req, res) => {
  try {
    const { checked, name, calories, isCustom, recipe } = req.body;
    const entry = { checked: checked || false, name: name || '', recipe: recipe || null, calories: calories ?? null, isCustom: isCustom || false };
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(req.params.date), user: req.user._id },
      { $push: { 'comidas.colacion': entry } },
      { upsert: true, new: true }
    ).populate('comidas.desayuno.recipe comidas.almuerzo.recipe comidas.merienda.recipe comidas.cena.recipe comidas.colacion.recipe');
    res.json(normalizeLog(log));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:date/colacion/:index', auth, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const { checked, name, calories, isCustom, recipe } = req.body;
    const entry = {};
    if (checked !== undefined) entry[`comidas.colacion.${index}.checked`] = checked;
    if (name !== undefined) entry[`comidas.colacion.${index}.name`] = name;
    if (calories !== undefined) entry[`comidas.colacion.${index}.calories`] = calories;
    if (isCustom !== undefined) entry[`comidas.colacion.${index}.isCustom`] = isCustom;
    if (recipe !== undefined) entry[`comidas.colacion.${index}.recipe`] = recipe;
    const log = await DailyLog.findOneAndUpdate(
      { date: new Date(req.params.date), user: req.user._id },
      { $set: entry },
      { new: true }
    ).populate('comidas.desayuno.recipe comidas.almuerzo.recipe comidas.merienda.recipe comidas.cena.recipe comidas.colacion.recipe');
    if (!log) return res.status(404).json({ message: 'No hay registro para esta fecha' });
    res.json(normalizeLog(log));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:date/colacion/:index', auth, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const log = await DailyLog.findOne({ date: new Date(req.params.date), user: req.user._id });
    if (!log) return res.status(404).json({ message: 'No hay registro' });
    if (!log.comidas?.colacion || index >= log.comidas.colacion.length) {
      return res.status(404).json({ message: 'Colación no encontrada' });
    }
    log.comidas.colacion.splice(index, 1);
    await log.save();
    const populated = await DailyLog.findById(log._id)
      .populate('comidas.desayuno.recipe comidas.almuerzo.recipe comidas.merienda.recipe comidas.cena.recipe comidas.colacion.recipe');
    res.json(normalizeLog(populated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
