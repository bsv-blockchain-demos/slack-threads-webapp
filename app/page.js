import ThreadList from '../src/components/ThreadList';
import '../src/styles/HomePage.css';
import dotenv from 'dotenv';
import { getVotesByMessageTSBatch } from '../src/lib/voteController';
import { getUsersByIdBatch } from '../src/lib/userController';
dotenv.config();

export const dynamic = 'force-dynamic'; // Disable caching

export async function generateMetadata({ searchParams }) {
  let { search } = await searchParams;

  search = search || '';

  return {
    title: search ? `Slack Threads - Search: ${search}` : 'Slack Threads - All Threads',
    description: search
      ? `Browse all Slack threads tagged with ${search}.`
      : 'Browse all saved Slack thread discussions.',
  };
}

export default async function ThreadsPage({ searchParams }) {
  let { search, page, limit } = await searchParams;

  search = search || '';
  page = Number(page) || 1;
  limit = 10;

  // Fetch your threads from your API route (or directly call your DB function)
  const res = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/threads?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`, {
    // Make sure this fetch is from server, no caching to keep fresh data
    cache: 'no-store',
  });
  const data = await res.json();

  // Check votes for each message
  // Then add them into thread.messages
  const allMessageTS = data.threads.flatMap(thread =>
    thread.messages.map(message => message.ts)
  );
  const firstUserIds = data.threads.map(thread => thread.messages[0].user);

  let voteMap = {};
  try {
    voteMap = await getVotesByMessageTSBatch(allMessageTS);
  } catch (error) {
    console.error('Error fetching votes:', error);
    return;
  }

  let userMap = {};
  try {
    userMap = await getUsersByIdBatch(firstUserIds);
  } catch (error) {
    console.error('Error fetching users:', error);
    return;
  }

  for (const thread of data.threads) {
    thread.messages[0].userInfo.username = userMap[thread.messages[0].user]?.username || null;
    for (const message of thread.messages) {
      message.votes = voteMap[message.ts] || { upvotes: [], downvotes: [] };
    }
  }

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
