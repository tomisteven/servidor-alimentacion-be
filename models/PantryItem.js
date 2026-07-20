import mongoose from 'mongoose';

const CATEGORIES = [
  'verduras', 'frutas', 'carnes', 'lácteos', 'huevos',
  'granos', 'pastas', 'condimentos', 'conservas', 'congelados',
  'panadería', 'bebidas', 'snacks', 'otros'
];

const pantryItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    default: 'unidad',
    trim: true
  },
  category: {
    type: String,
    enum: CATEGORIES,
    default: 'otros'
  },
  expiryDate: {
    type: Date,
    default: null
  },
  caloriesPer100g: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

pantryItemSchema.index({ user: 1, name: 1 }, { unique: true, sparse: true });
pantryItemSchema.index({ house: 1, name: 1 }, { unique: true, sparse: true });

export default mongoose.model('PantryItem', pantryItemSchema);
export { CATEGORIES };
