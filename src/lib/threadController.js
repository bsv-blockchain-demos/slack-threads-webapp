import mongoose from 'mongoose';

// Get all threads - works both as a direct function call and as an API route handler
export async function getAllThreads({ sort = 'newest', limit = 20, skip = 0 } = {}) {
  const threadsCollection = mongoose.connection.db.collection('threads');

  let sortOptions = {};
  if (sort === 'newest') {
    sortOptions = { 'messages.0.ts': -1 };
  } else if (sort === 'active') {
    sortOptions = { last_updated: -1 };
  }

  const threads = await threadsCollection
    .find({})
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .toArray();

  return threads;
}

// Search threads by question text
export async function searchThreads(query) {
  const threadsCollection = mongoose.connection.db.collection('threads');

  if (!query) {
    // Fallback to returning all threads if no search term
    return getAllThreads();
  }

  const searchRegex = new RegExp(query.split(' ').join('|'), 'i');

  const matchingThreads = await threadsCollection
    .find({ 'messages.0.text': searchRegex })
    .sort({ 'messages.0.ts': -1 })
    .toArray();

  return matchingThreads;
}

// Get thread by ID
export async function getThreadById(threadId) {
  if (!threadId) {
    throw new Error('Thread ID is required');
  }

  const threadsCollection = mongoose.connection.db.collection('threads');

  const rawThread = await threadsCollection.findOne({ _id: threadId });

  if (!rawThread) {
    throw new Error('Thread not found');
  }

  return rawThread;
}
