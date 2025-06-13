import mongoose from 'mongoose';

// Create a completely flexible schema that will work with any MongoDB document structure
// This is important when working with existing data that wasn't created by our application

const ThreadSchema = new mongoose.Schema({}, {
  strict: false,  // Don't enforce schema structure
  collection: 'threads'  // Explicitly set collection name
});

// Override the default _id behavior to use the string ID from MongoDB
ThreadSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    // Keep the original _id format
    return ret;
  }
});

export default mongoose.model('Thread', ThreadSchema);
