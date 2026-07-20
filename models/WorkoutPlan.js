import mongoose from 'mongoose';

const daySchema = new mongoose.Schema({
  name: { type: String, default: '' },
  exercises: [{
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
    sets: { type: Number, default: 3 },
    reps: { type: String, default: '10' },
    weight: { type: Number, default: 0 },
    restSeconds: { type: Number, default: 60 },
    order: { type: Number, default: 0 },
    notes: { type: String, default: '' }
  }]
}, { _id: false });

const workoutPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  days: [daySchema],
  difficulty: {
    type: String,
    enum: ['principiante', 'intermedio', 'avanzado'],
    default: 'principiante'
  },
  durationWeeks: { type: Number, default: 4 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isAIGenerated: { type: Boolean, default: false },
  tags: [{ type: String }]
}, { timestamps: true });

export default mongoose.model('WorkoutPlan', workoutPlanSchema);
