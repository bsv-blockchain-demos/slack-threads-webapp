import mongoose from 'mongoose';

// Get user by their ID
export async function getUserById(userId) {
  if (!userId) throw new Error('User ID is required');

  try {
    const usersCollection = mongoose.connection.db.collection('users');
    const user = await usersCollection.findOne({ _id: userId });

    return user || null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}