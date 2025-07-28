import ThreadDetail from './ThreadDetail';
import Link from 'next/link';
import '../../../src/styles/ThreadDetail.css';

import dbConnect from '../../../src/lib/db';
import { getThreadById } from '../../../src/lib/threadController';
import { getUserById } from '../../../src/lib/userController';
import { getVotesByMessageTS } from '../../../src/lib/voteController';

export const dynamic = 'force-dynamic'; // to disable caching

export default async function ThreadPage({ params }) {
  const { threadId } = await params;

  try {
    await dbConnect(); // Connect to MongoDB
    const thread = await getThreadById(threadId); // Direct database access

    if (!thread) {
      throw new Error('Thread not found');
    }

    // Check PayMail and votes for each message
    // Then add them into thread.messages
    await Promise.all(
      thread.messages.map(async (message) => {
        try {
          const [user, votes] = await Promise.all([
            getUserById(message.user),
            getVotesByMessageTS(message.ts)
          ]);
    
          message.paymail = user?.paymail || null;
          message.votes = votes;
        } catch (error) {
          console.error(`Error processing message with ts=${message.ts}:`, error);
          message.paymail = null;
          message.votes = { upvotes: [], downvotes: [] };
        }
      })
    );

    return (
      <>
        <ThreadDetail thread={JSON.parse(JSON.stringify(thread))} />
      </>
    )
  } catch (error) {
    return (
      <div className="thread-detail">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error.message}</p>
          <p>Thread ID: {threadId}</p>
          <div className="troubleshooting">
            <ul>
              <li>Check thread ID</li>
              <li>Ensure DB connection is working</li>
              <li>Check if thread exists</li>
            </ul>
          </div>
          <div className="back-link">
            <Link href="/">← Back to all threads</Link>
          </div>
        </div>
      </div>
    );
  }
}
