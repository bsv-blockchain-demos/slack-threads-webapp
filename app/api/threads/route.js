import dbConnect from '../../../src/lib/db';
import { getAllThreads } from '../../../src/lib/threadController';
import { NextResponse } from 'next/server';

export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;

  const data = await getAllThreads({
    query: search,
    page,
    limit,
  });

  return NextResponse.json(data);
}