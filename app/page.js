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
  limit = 10;

  // Fetch your threads from your API route (or directly call your DB function)
  const res = await fetch(`${process.env.HOST}/api/threads?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`, {
    // Make sure this fetch is from server, no caching to keep fresh data
    cache: 'no-store',
  });
  const data = await res.json();

  const verifyUrl = `${process.env.HOST}/api/verify`;

  // Check votes for each message
  // Then add them into thread.messages
  await Promise.all(
    data.threads.map(async (thread) => {

      // Check integrity of thread
      const integrityCheck = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread,
        }),
      });
      const integrityData = await integrityCheck.json();
      
      thread.verified = integrityData.success || false;

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
