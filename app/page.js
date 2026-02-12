import ThreadList from '../src/components/ThreadList';
import '../src/styles/HomePage.css';
import dotenv from 'dotenv';
import dbConnect from '../src/lib/db';
import { getAllThreads } from '../src/lib/threadController';
import { getVotesByMessageTSBatch } from '../src/lib/voteController';
import { getUsersByIdBatch } from '../src/lib/userController';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

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

  await dbConnect();

  const data = await getAllThreads({
    query: search,
    page,
    limit,
  });

  // Check votes for each message
  // Then add them into thread.messages
  const firstMessageTS = data.threads
    .map(thread => thread?.messages?.[0]?.ts)
    .filter(Boolean);

  const firstUserIds = data.threads
    .map(thread => thread?.messages?.[0]?.user)
    .filter(Boolean);

  let voteMap = {};
  try {
    voteMap = await getVotesByMessageTSBatch(firstMessageTS);
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
    thread.messages[0].votes = voteMap[thread.messages[0].ts] || { upvotes: [], downvotes: [] };
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
