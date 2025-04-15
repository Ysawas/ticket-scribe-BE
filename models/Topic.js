import mongoose from 'mongoose';

const TopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  category: { 
    type: String,
    required: true
  },
  subcategory: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  version: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Topic', TopicSchema);