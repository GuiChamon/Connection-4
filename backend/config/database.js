const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    console.log(`📊 Banco de dados: ${conn.connection.name}`);
    console.log(`🔗 MongoDB Compass URI: ${process.env.MONGODB_URI}`);
    
    // Event listeners para monitoramento
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose conectado ao MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('🔴 Erro de conexão MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('🟡 Mongoose desconectado do MongoDB');
    });
    
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;