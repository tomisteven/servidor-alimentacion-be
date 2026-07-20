import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

import User from './models/User.js';
import House from './models/House.js';
import PantryItem from './models/PantryItem.js';

const FOODS = [
  { name: 'Pechuga de pollo', category: 'carnes', unit: 'gr', caloriesPer100g: 165 },
  { name: 'Carne picada (90% magra)', category: 'carnes', unit: 'gr', caloriesPer100g: 176 },
  { name: 'Carré de cerdo', category: 'carnes', unit: 'gr', caloriesPer100g: 210 },
  { name: 'Atún al natural', category: 'conservas', unit: 'gr', caloriesPer100g: 116 },
  { name: 'Leche entera', category: 'lácteos', unit: 'ml', caloriesPer100g: 61 },
  { name: 'Leche descremada', category: 'lácteos', unit: 'ml', caloriesPer100g: 34 },
  { name: 'Crema de leche', category: 'lácteos', unit: 'ml', caloriesPer100g: 340 },
  { name: 'Queso semiduro', category: 'lácteos', unit: 'gr', caloriesPer100g: 350 },
  { name: 'Queso rallado', category: 'lácteos', unit: 'gr', caloriesPer100g: 390 },
  { name: 'Queso untable descremado', category: 'lácteos', unit: 'gr', caloriesPer100g: 150 },
  { name: 'Yogur natural descremado', category: 'lácteos', unit: 'gr', caloriesPer100g: 60 },
  { name: 'Yogur griego natural', category: 'lácteos', unit: 'gr', caloriesPer100g: 97 },
  { name: 'Huevo', category: 'huevos', unit: 'unidad', caloriesPer100g: 143 },
  { name: 'Avena', category: 'granos', unit: 'gr', caloriesPer100g: 389 },
  { name: 'Arroz blanco (crudo)', category: 'granos', unit: 'gr', caloriesPer100g: 365 },
  { name: 'Arroz integral (crudo)', category: 'granos', unit: 'gr', caloriesPer100g: 360 },
  { name: 'Fideos secos', category: 'pastas', unit: 'gr', caloriesPer100g: 371 },
  { name: 'Garbanzos cocidos', category: 'granos', unit: 'gr', caloriesPer100g: 164 },
  { name: 'Lentejas cocidas', category: 'granos', unit: 'gr', caloriesPer100g: 116 },
  { name: 'Arvejas cocidas', category: 'granos', unit: 'gr', caloriesPer100g: 84 },
  { name: 'Papa', category: 'verduras', unit: 'gr', caloriesPer100g: 77 },
  { name: 'Batata', category: 'verduras', unit: 'gr', caloriesPer100g: 86 },
  { name: 'Zanahoria', category: 'verduras', unit: 'gr', caloriesPer100g: 41 },
  { name: 'Zapallito', category: 'verduras', unit: 'gr', caloriesPer100g: 17 },
  { name: 'Zucchini', category: 'verduras', unit: 'gr', caloriesPer100g: 17 },
  { name: 'Berenjena', category: 'verduras', unit: 'gr', caloriesPer100g: 25 },
  { name: 'Calabaza', category: 'verduras', unit: 'gr', caloriesPer100g: 26 },
  { name: 'Tomate', category: 'verduras', unit: 'gr', caloriesPer100g: 18 },
  { name: 'Cebolla', category: 'verduras', unit: 'gr', caloriesPer100g: 40 },
  { name: 'Morrón rojo', category: 'verduras', unit: 'gr', caloriesPer100g: 31 },
  { name: 'Morrón verde', category: 'verduras', unit: 'gr', caloriesPer100g: 20 },
  { name: 'Lechuga', category: 'verduras', unit: 'gr', caloriesPer100g: 15 },
  { name: 'Espinaca', category: 'verduras', unit: 'gr', caloriesPer100g: 23 },
  { name: 'Pepino', category: 'verduras', unit: 'gr', caloriesPer100g: 15 },
  { name: 'Ajo', category: 'verduras', unit: 'gr', caloriesPer100g: 149 },
  { name: 'Puré de tomate', category: 'conservas', unit: 'gr', caloriesPer100g: 29 },
  { name: 'Banana', category: 'frutas', unit: 'gr', caloriesPer100g: 89 },
  { name: 'Manzana', category: 'frutas', unit: 'gr', caloriesPer100g: 52 },
  { name: 'Limón', category: 'frutas', unit: 'gr', caloriesPer100g: 29 },
  { name: 'Chía', category: 'granos', unit: 'gr', caloriesPer100g: 486 },
  { name: 'Tapa de tarta', category: 'panadería', unit: 'unidad', caloriesPer100g: 340 },
  { name: 'Tapa de empanadas', category: 'panadería', unit: 'unidad', caloriesPer100g: 320 },
  { name: 'Aceite de oliva', category: 'condimentos', unit: 'ml', caloriesPer100g: 884 },
  { name: 'Mostaza', category: 'condimentos', unit: 'gr', caloriesPer100g: 66 },
  { name: 'Vinagre', category: 'condimentos', unit: 'ml', caloriesPer100g: 18 },
  { name: 'Orégano seco', category: 'condimentos', unit: 'gr', caloriesPer100g: 306 },
  { name: 'Pimentón', category: 'condimentos', unit: 'gr', caloriesPer100g: 282 },
  { name: 'Comino', category: 'condimentos', unit: 'gr', caloriesPer100g: 375 },
  { name: 'Curry', category: 'condimentos', unit: 'gr', caloriesPer100g: 325 },
  { name: 'Pimienta', category: 'condimentos', unit: 'gr', caloriesPer100g: 251 },
  { name: 'Café instantáneo', category: 'bebidas', unit: 'gr', caloriesPer100g: 353 },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB\n');

    const users = await User.find();
    if (users.length === 0) {
      console.log('❌ No hay usuarios. Primero corre: npm run seed --prefix server');
      process.exit(1);
    }

    const houses = await House.find();
    if (houses.length === 0) {
      console.log('❌ No hay casas. Primero corre: npm run migrate --prefix server');
      process.exit(1);
    }

    for (const house of houses) {
      console.log(`🏠 ${house.name}`);
      let count = 0;
      for (const food of FOODS) {
        const exists = await PantryItem.findOne({ house: house._id, name: food.name });
        if (!exists) {
          await PantryItem.create({ ...food, house: house._id, amount: 0 });
          count++;
        }
      }
      console.log(`   ${count} alimentos nuevos (${FOODS.length - count} ya existían)\n`);
    }

    console.log('✅ Despensa cargada correctamente');
    console.log(`   Total: ${FOODS.length} alimentos por casa`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seed();
