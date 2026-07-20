import mongoose from 'mongoose';

const dailyLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comidas: {
    desayuno: { type: Boolean, default: false },
    almuerzo: { type: Boolean, default: false },
    merienda: { type: Boolean, default: false },
    cena: { type: Boolean, default: false }
  },
  actividadFisica: {
    realizada: { type: Boolean, default: false },
    tipo: { type: String, default: '' },
    duracionMinutos: { type: Number, default: 0 },
    intensidad: {
      type: String,
      enum: ['baja', 'media', 'alta', ''],
      default: ''
    }
  },
  entrenamiento: {
    realizado: { type: Boolean, default: false },
    rutina: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutPlan', default: null },
    ejercicios: [{
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
      nombre: { type: String, default: '' },
      completado: { type: Boolean, default: false },
      series: { type: Number, default: 0 },
      repeticiones: { type: Number, default: 0 },
      peso: { type: Number, default: 0 },
      notas: { type: String, default: '' }
    }],
    duracionMinutos: { type: Number, default: 0 },
    notas: { type: String, default: '' }
  },
  notas: {
    type: String,
    default: ''
  },
  humor: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  agua: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

dailyLogSchema.index({ date: 1, user: 1 }, { unique: true });

export default mongoose.model('DailyLog', dailyLogSchema);
