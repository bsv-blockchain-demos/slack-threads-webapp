import ThreadList from '../src/components/ThreadList';
import dbConnect from '../src/lib/db';
import { getAllThreads } from '../src/lib/threadController';
import '../src/styles/HomePage.css';

export const dynamic = 'force-dynamic'; // Disable caching

export default async function ThreadsPage() {
  await dbConnect();
  const threads = await getAllThreads(); // Use your Mongoose controller

  return (
    <div className="home-page">
      <div className="header">
        <h1>Slack Threads</h1>
        <p>Recent discussions from Slack</p>
      </div>
      <ThreadList initialThreads={threads} />
    </div>
  );
}