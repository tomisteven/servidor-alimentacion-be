import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error conectando a MongoDB: ${error.message}`);
    console.error('Verifica que:');
    console.error('  1. Tu IP esté whitelisted en Atlas (Network Access > Add IP Address)');
    console.error('  2. El usuario/contraseña sean correctos');
    console.error('  3. Tengas conexión a internet');
    process.exit(1);
  }
};

export default connectDB;
