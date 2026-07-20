import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import recipeRoutes from './routes/recipes.js';
import mealPlanRoutes from './routes/mealplans.js';
import dailyLogRoutes from './routes/dailylog.js';
import activityRoutes from './routes/activities.js';
import openaiRoutes from './routes/openai.js';
import pantryRoutes from './routes/pantry.js';
import houseRoutes from './routes/houses.js';
import invitationRoutes from './routes/invitations.js';
import exerciseRoutes from './routes/exercises.js';
import workoutRoutes from './routes/workouts.js';
import reportRoutes from './routes/reports.js';

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/mealplans', mealPlanRoutes);
app.use('/api/dailylog', dailyLogRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/openai', openaiRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Plan Alimentación API funcionando' });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

export default app;
