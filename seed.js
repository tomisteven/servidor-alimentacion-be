import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import User from './models/User.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

const users = [
  { name: 'To', email: 'to@plan.com', password: '123456' },
  { name: 'Be', email: 'be@plan.com', password: '123456' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB');

    for (const u of users) {
      const exists = await User.findOne({ email: u.email });
      if (exists) {
        console.log(`  ${u.name} ya existe (${exists.email})`);
      } else {
        const user = await User.create(u);
        console.log(`  ${u.name} creado (${user.email})`);
      }
    }

    const all = await User.find();
    if (all.length === 2) {
      all[0].partnerId = all[1]._id;
      all[1].partnerId = all[0]._id;
      await all[0].save();
      await all[1].save();
      console.log('Vinculación mutua completada');
    }

    console.log('\nUsuarios listos:');
    console.log('  To → to@plan.com / 123456');
    console.log('  Be → be@plan.com / 123456');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seed();
