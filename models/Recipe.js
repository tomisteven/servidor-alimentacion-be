import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  ingredients: [{
    name: String,
    amount: String,
    unit: String,
    caloriesPer100g: { type: Number, default: 0 },
    calories: { type: Number, default: 0 }
  }],
  instructions: {
    type: String,
    required: true
  },
  prepTime: {
    type: Number,
    default: 0
  },
  cookTime: {
    type: Number,
    default: 0
  },
  servings: {
    type: Number,
    default: 1
  },
  calories: {
    type: Number,
    default: 0
  },
  protein: {
    type: Number,
    default: 0
  },
  carbs: {
    type: Number,
    default: 0
  },
  fats: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  mealType: {
    type: String,
    enum: ['desayuno', 'almuerzo', 'merienda', 'cena', 'cualquiera'],
    default: 'cualquiera'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('Recipe', recipeSchema);
