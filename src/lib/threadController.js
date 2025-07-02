import mongoose from 'mongoose';

// Get all threads - works both as a direct function call and as an API route handler
export async function getAllThreads({ query, limit = 30, page = 1 } = {}) {
  const threadsCollection = mongoose.connection.db.collection('threads');

  const skip = (page - 1) * limit;

  // Helper for search regex
  const buildSearchFilter = (query) => {
    if (!query) return {};
    const searchRegex = new RegExp(query.split(' ').join('|'), 'i');
    return { 'messages.0.text': searchRegex };
  };

  const [threads, total] = await Promise.all([
    threadsCollection
      .find(buildSearchFilter(query))
      .sort({ 'messages.0.ts': -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    threadsCollection.countDocuments(buildSearchFilter(query)),
  ]);

  return { threads, total };
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
