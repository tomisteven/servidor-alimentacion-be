import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

import User from './models/User.js';
import House from './models/House.js';
import PantryItem from './models/PantryItem.js';
import MealPlan from './models/MealPlan.js';

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB\n');

    const users = await User.find();
    if (users.length === 0) {
      console.log('❌ No hay usuarios. Primero corre: npm run seed --prefix server');
      process.exit(1);
    }

    for (const user of users) {
      if (user.house) {
        console.log(`  ${user.name} ya tiene casa asignada`);
        continue;
      }

      if (user.partnerId) {
        const partner = await User.findById(user.partnerId);
        if (partner?.house) {
          user.house = partner.house;
          await user.save();
          console.log(`  ${user.name} → unido a casa de ${partner.name}`);
          continue;
        }
        const house = await House.create({
          name: `Casa de ${user.name} & ${partner.name}`,
          members: [user._id, partner._id],
          createdBy: user._id
        });
        user.house = house._id;
        partner.house = house._id;
        await user.save();
        await partner.save();
        console.log(`  🏠 Casa creada: ${house.name}`);
      } else {
        const house = await House.create({
          name: `Casa de ${user.name}`,
          members: [user._id],
          createdBy: user._id
        });
        user.house = house._id;
        await user.save();
        console.log(`  🏠 Casa creada: ${house.name}`);
      }
    }

    const pantryItems = await PantryItem.find({ house: null, user: { $ne: null } });
    for (const item of pantryItems) {
      const user = await User.findById(item.user);
      if (user?.house) {
        item.house = user.house;
        await item.save();
      }
    }
    console.log(`\n📦 ${pantryItems.length} ingredientes migrados a casas`);

    const mealPlans = await MealPlan.find({ house: null });
    for (const plan of mealPlans) {
      if (plan.updatedBy) {
        const user = await User.findById(plan.updatedBy);
        if (user?.house) {
          plan.house = user.house;
          await plan.save();
        }
      }
    }
    console.log(`📋 ${mealPlans.length} planes migrados a casas`);

    console.log('\n✅ Migración completada');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

migrate();
