import ThreadList from '../src/components/ThreadList';
import '../src/styles/HomePage.css';
import dotenv from 'dotenv';
import { getVotesByMessageTS } from '../src/lib/voteController';
dotenv.config();

export const dynamic = 'force-dynamic'; // Disable caching

export default async function ThreadsPage({ searchParams }) {
  let { search, page, limit } = await searchParams;

  search = search || '';
  page = Number(page) || 1;
  limit = Number(limit) || 10;

  // Fetch your threads from your API route (or directly call your DB function)
  const res = await fetch(`http://localhost:${process.env.PORT}/api/threads?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`, {
    // Make sure this fetch is from server, no caching to keep fresh data
    cache: 'no-store',
  });
  const data = await res.json();

  // Check votes for each message
  // Then add them into thread.messages
  await Promise.all(
    data.threads.map(async (thread) => {
      await Promise.all(
        thread.messages.map(async (message) => {
          try {
            const votes = await getVotesByMessageTS(message.ts);
            message.votes = votes;
          } catch (error) {
            console.error(`Error processing message with ts=${message.ts}:`, error);
            message.votes = { upvotes: [], downvotes: [] };
          }
        })
      );
    })
  );

  return (
    <ThreadList
      initialThreads={data.threads}
      total={data.total}
      initialSearch={search}
      initialPage={page}
      initialLimit={limit}
    />
  );
}