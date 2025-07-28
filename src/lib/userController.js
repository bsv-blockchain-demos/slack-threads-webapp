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

export async function getUsersByIdBatch(userIds) {
  const usersCollection = mongoose.connection.db.collection('users');

  const docs = await usersCollection
    .find({ _id: { $in: userIds.map(id => id) } })
    .toArray();

  const result = {};
  for (const user of docs) {
    result[user._id] = user;
  }

  return result;
}