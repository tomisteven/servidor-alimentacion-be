import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

import PantryItem from './models/PantryItem.js';
import User from './models/User.js';
import House from './models/House.js';

const cleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB\n');

    const items = await PantryItem.find({});
    console.log(`Total items: ${items.length}`);

    const toDelete = [];
    const seen = new Set();

    for (const item of items) {
      const key = item.house
        ? `house:${item.house}-name:${item.name.toLowerCase()}`
        : item.user
        ? `user:${item.user}-name:${item.name.toLowerCase()}`
        : null;
      if (!key) continue;
      if (seen.has(key)) {
        toDelete.push(item._id);
      } else {
        seen.add(key);
      }
    }

    if (toDelete.length > 0) {
      await PantryItem.deleteMany({ _id: { $in: toDelete } });
      console.log(`🗑️ Eliminados ${toDelete.length} duplicados`);
    } else {
      console.log('✅ Sin duplicados');
    }

    const orphaned = await PantryItem.find({ house: null, user: null });
    if (orphaned.length > 0) {
      await PantryItem.deleteMany({ _id: { $in: orphaned.map(i => i._id) } });
      console.log(`🗑️ Eliminados ${orphaned.length} items huérfanos`);
    }

    const withoutHouse = await PantryItem.find({ house: null, user: { $ne: null } });
    for (const item of withoutHouse) {
      const user = await User.findById(item.user);
      if (user?.house) {
        item.house = user.house;
        await item.save();
      }
    }
    console.log(`📦 ${withoutHouse.length} items migrados a su casa`);

    console.log('\n✅ Limpieza completada');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

cleanup();
