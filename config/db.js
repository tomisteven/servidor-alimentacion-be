import mongoose from 'mongoose';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (error) {
  console.warn('No se pudo establecer el servidor DNS personalizado:', error.message);
}

let cachedConn = null;
let cachedPromise = null;

const connectDB = async () => {
  if (cachedConn) {
    return cachedConn;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 15
      socketTimeoutMS: 45000,
    }).then((mongooseInstance) => {
      cachedConn = mongooseInstance;
      console.log(`MongoDB conectado: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    }).catch((error) => {
      cachedPromise = null; // Reset promise so next request can retry
      console.error(`Error conectando a MongoDB: ${error.message}`);
      throw error;
    });
  }

  return cachedPromise;
};

export default connectDB;
