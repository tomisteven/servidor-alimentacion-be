import express from 'express';
import DailyLog from '../models/DailyLog.js';
import MealPlan from '../models/MealPlan.js';
import Recipe from '../models/Recipe.js';
import PantryItem from '../models/PantryItem.js';
import WorkoutPlan from '../models/WorkoutPlan.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const userId = req.params.userId;
    const dateFilter = start && end ? { $gte: new Date(start), $lte: new Date(end) } : {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const dailyLogs = await DailyLog.find({
      user: userId,
      ...(start && end ? { date: dateFilter } : { date: { $gte: thirtyDaysAgo } })
    }).sort({ date: -1 });

    const mealPlans = await MealPlan.find({
      house: user.house,
      ...(start && end ? { date: dateFilter } : {})
    }).sort({ date: -1 });

    const totalLogs = dailyLogs.length;
    const daysWithActivity = dailyLogs.filter(l => l.actividadFisica?.realizada).length;
    const daysWithWorkout = dailyLogs.filter(l => l.entrenamiento?.realizado).length;
    const totalWorkouts = dailyLogs.reduce((sum, l) => sum + (l.entrenamiento?.ejercicios?.filter(e => e.completado).length || 0), 0);
    const totalExerciseMinutes = dailyLogs.reduce((sum, l) => sum + (l.entrenamiento?.duracionMinutos || 0), 0);
    const totalActivityMinutes = dailyLogs.reduce((sum, l) => sum + (l.actividadFisica?.duracionMinutos || 0), 0);
    const totalWater = dailyLogs.reduce((sum, l) => sum + (l.agua || 0), 0);
    const avgMood = totalLogs > 0 ? (dailyLogs.reduce((sum, l) => sum + (l.humor || 0), 0) / totalLogs).toFixed(1) : 0;
    const mealsLogged = dailyLogs.reduce((sum, l) => {
      const c = l.comidas || {};
      return sum + (c.desayuno ? 1 : 0) + (c.almuerzo ? 1 : 0) + (c.merienda ? 1 : 0) + (c.cena ? 1 : 0);
    }, 0);

    const recentLogs = dailyLogs.slice(0, 7);
    const weeklyTrend = recentLogs.map(l => ({
      date: l.date,
      actividad: l.actividadFisica?.realizada || false,
      entrenamiento: l.entrenamiento?.realizado || false,
      humor: l.humor,
      agua: l.agua,
      comidas: l.comidas
    }));

    const popularExercises = dailyLogs
      .flatMap(l => l.entrenamiento?.ejercicios || [])
      .filter(e => e.completado)
      .reduce((acc, e) => {
        const name = e.nombre || 'Ejercicio';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

    const recipesCreated = await Recipe.countDocuments({ createdBy: userId });
    const pantryCount = await PantryItem.countDocuments({ house: user.house });
    const workoutPlans = await WorkoutPlan.countDocuments({
      $or: [{ createdBy: userId }, { assignedTo: userId }]
    });

    const streak = calculateStreak(dailyLogs);

    res.json({
      user: { name: user.name, email: user.email },
      period: { start: start || thirtyDaysAgo, end: end || new Date() },
      summary: {
        totalLogs,
        daysWithActivity,
        daysWithWorkout,
        totalWorkoutsCompleted: totalWorkouts,
        totalExerciseMinutes,
        totalActivityMinutes,
        totalWater,
        avgMood,
        mealsLogged,
        streak
      },
      recipesCreated,
      pantryCount,
      workoutPlansCreated: workoutPlans,
      weeklyTrend,
      popularExercises: Object.entries(popularExercises)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function calculateStreak(logs) {
  if (!logs.length) return 0;
  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  for (const log of sorted) {
    if (log.actividadFisica?.realizada || log.entrenamiento?.realizado) {
      streak++;
    } else break;
  }
  return streak;
}

export default router;
