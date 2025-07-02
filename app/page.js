import ThreadList from '../src/components/ThreadList';
import '../src/styles/HomePage.css';
import dotenv from 'dotenv';
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
  console.log('Response:', data);

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