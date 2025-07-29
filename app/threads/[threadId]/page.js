import ThreadDetail from './ThreadDetail';
import Link from 'next/link';
import '../../../src/styles/ThreadDetail.css';

import dbConnect from '../../../src/lib/db';
import { getThreadById } from '../../../src/lib/threadController';
import { getUsersByIdBatch } from '../../../src/lib/userController';
import { getVotesByMessageTSBatch } from '../../../src/lib/voteController';

export const dynamic = 'force-dynamic'; // to disable caching

export async function generateMetadata({ params }) {
  const { threadId } = await params;

  try {
    await dbConnect(); // Connect to MongoDB
    const thread = await getThreadById(threadId); // Direct database access

    if (!thread) {
      throw new Error('Thread not found');
    }

    const tag = thread?.messages?.[0]?.text.slice(0, 60) || 'Unknown Thread';

    return {
      title: `Slack Threads - ${tag}`,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Slack Threads',
    };
  }
}

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
    const userIDs = [...new Set(thread.messages.map(m => m.user))];
    const userMap = await getUsersByIdBatch(userIDs);

    const messageTSs = thread.messages.map(m => m.ts);
    const voteMap = await getVotesByMessageTSBatch(messageTSs);

    for (const message of thread.messages) {
      const user = userMap[message.user?.toString()];
      const votes = voteMap[message.ts];
    
      message.paymail = user?.paymail || null;
      message.userInfo.username = user?.username || null;
      message.votes = votes || { upvotes: [], downvotes: [] };
    }

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
