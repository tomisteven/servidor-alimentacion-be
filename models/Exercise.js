import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  muscleGroup: {
    type: String,
    enum: ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'piernas', 'gluteos', 'abdominales', 'cardio', 'cuerpo-completo', 'estiramiento', 'otros'],
    default: 'otros'
  },
  equipment: {
    type: String,
    enum: ['pesas', 'mancuernas', 'barra', 'maquina', 'cable', 'banda', 'cuerpo-libre', 'cardio', 'ninguno', 'otros'],
    default: 'ninguno'
  },
  difficulty: {
    type: String,
    enum: ['principiante', 'intermedio', 'avanzado'],
    default: 'principiante'
  },
  instructions: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAIGenerated: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Exercise', exerciseSchema);
