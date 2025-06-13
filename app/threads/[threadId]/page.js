import ThreadDetail from './ThreadDetail';
import Link from 'next/link';
import '../../../src/styles/ThreadDetail.css';

import dbConnect from '../../../src/lib/db';
import { getThreadById } from '../../../src/lib/threadController';

export const dynamic = 'force-dynamic'; // to disable caching

export default async function ThreadPage({ params }) {
  const { threadId } = params;

  try {
    await dbConnect(); // Connect to MongoDB
    const thread = await getThreadById(threadId); // Direct database access

    if (!thread) {
      throw new Error('Thread not found');
    }

    return <ThreadDetail thread={JSON.parse(JSON.stringify(thread))} />;
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
