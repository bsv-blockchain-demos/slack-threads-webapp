import mongoose from 'mongoose';

// Get user by ID
export async function getVotesByMessageTS(messageTS) {
    if (!messageTS) {
        throw new Error('Message TS is required');
    }

    const votesCollection = mongoose.connection.db.collection('votes');
    const doc = await votesCollection.findOne({ _id: messageTS });

    const votes = doc?.votes || { upvotes: [], downvotes: [] };

    return {
        upvotes: Array.isArray(votes.upvotes) ? votes.upvotes : [],
        downvotes: Array.isArray(votes.downvotes) ? votes.downvotes : [],
    };
}