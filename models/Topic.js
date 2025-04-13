// models/Topic.js
import mongoose from 'mongoose';

const TopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['software', 'hardware', 'finance', 'sales', 'operation', 'server', 'category', 'other'],
    default: 'other'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  subcategory: {
    type: String
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