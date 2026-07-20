import mongoose from 'mongoose';

const mealPlanSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  desayuno: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null
  },
  almuerzo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null
  },
  merienda: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null
  },
  cena: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    default: null
  }
}, { timestamps: true });

mealPlanSchema.index({ date: 1, house: 1 }, { unique: true });

export default mongoose.model('MealPlan', mealPlanSchema);
