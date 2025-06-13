import Thread from '../models/Thread.js';
import mongoose from 'mongoose';

// Get all threads
export const getAllThreads = async (req, res) => {
  try {
    console.log('Fetching all threads...');
    
    // Get query parameters for sorting and pagination
    const sort = req.query.sort || 'newest'; // Default sort by newest
    const limit = parseInt(req.query.limit) || 20; // Default limit to 20 threads
    const skip = parseInt(req.query.skip) || 0; // Default skip to 0
    
    // Try to get the raw collection to see what's actually there
    const threadsCollection = mongoose.connection.db.collection('threads');
    
    // Create sort options
    let sortOptions = {};
    if (sort === 'newest') {
      // Sort by the timestamp of the first message in each thread
      sortOptions = { 'messages.0.ts': -1 };
    } else if (sort === 'active') {
      // Sort by the last_updated field
      sortOptions = { last_updated: -1 };
    }
    
    // Get threads with sorting and pagination
    const rawThreads = await threadsCollection.find({})
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();
      
    console.log(`Found ${rawThreads.length} raw threads in collection`);
    
    // Return raw threads if model doesn't work
    res.json(rawThreads);
  } catch (err) {
    console.error('Error fetching threads:', err);
    res.status(500).json({ message: err.message });
  }
};

// Search threads by question text
export const searchThreads = async (req, res) => {
  try {
    const searchQuery = req.query.q;
    console.log(`Searching threads with query: ${searchQuery}`);
    
    if (!searchQuery) {
      // If no query provided, return all threads
      return getAllThreads(req, res);
    }
    
    // Create a case-insensitive regex for fuzzy search
    const searchRegex = new RegExp(searchQuery.split(' ').join('|'), 'i');
    
    const threadsCollection = mongoose.connection.db.collection('threads');
    
    // Search in the first message (question) text
    const matchingThreads = await threadsCollection.find({
      'messages.0.text': searchRegex
    }).sort({ 'messages.0.ts': -1 }).toArray();
    
    console.log(`Found ${matchingThreads.length} threads matching query: ${searchQuery}`);
    res.json(matchingThreads);
  } catch (err) {
    console.error('Error searching threads:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get thread by ID
export const getThreadById = async (req, res) => {
  try {
    // Log the entire request params and URL to debug
    console.log('Request URL:', req.originalUrl);
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    
    const threadId = req.params.id;
    console.log(`Fetching thread with ID: ${threadId}`);
    console.log(`Thread ID type: ${typeof threadId}`);
    
    if (!threadId) {
      return res.status(400).json({ message: 'Thread ID is required' });
    }
    
    // Try direct collection access first as it's more reliable with the existing data structure
    const threadsCollection = mongoose.connection.db.collection('threads');
    console.log(`Looking for thread with ID: ${threadId} in collection directly`);
    
    // Find thread by ID
    let rawThread = await threadsCollection.findOne({ '_id': threadId });
    console.log('Search by _id result:', rawThread ? 'Found' : 'Not found');
    
    // If not found
    if (!rawThread) {
      // return error
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    // Return the thread
    res.json(rawThread);
  } catch (err) {
    console.error(`Error fetching thread with ID ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
};
