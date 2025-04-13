import mongoose from 'mongoose';

const connectDB = async () => {
  console.log('DB Config: Connecting to MongoDB...');
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`DB Config: MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('DB Config: Error connecting to MongoDB:', error.message);
    process.exit(1);
  } finally {
    console.log('DB Config: connectDB function completed');
  }
};

export default connectDB;