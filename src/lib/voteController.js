import mongoose from 'mongoose';

// Get votes for multiple message timestamps
export async function getVotesByMessageTSBatch(messageTSArray) {
  if (!Array.isArray(messageTSArray) || messageTSArray.length === 0) {
    return {};
  }

  const votesCollection = mongoose.connection.db.collection('votes');

  const docs = await votesCollection
    .find({ _id: { $in: messageTSArray } })
    .toArray();

  const result = {};

  for (const doc of docs) {
    const votes = doc?.votes || {};
    result[doc._id] = {
      upvotes: Array.isArray(votes.upvotes) ? votes.upvotes : [],
      downvotes: Array.isArray(votes.downvotes) ? votes.downvotes : [],
    };
  }

  return result;
}