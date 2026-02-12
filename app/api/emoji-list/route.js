import { NextResponse } from 'next/server';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export async function GET() {
  const slackToken = process.env.SLACK_BOT_TOKEN;

  const res = await fetch('https://slack.com/api/emoji.list', {
    headers: {
      Authorization: `Bearer ${slackToken}`,
    },
  });

  const data = await res.json();

  if (!data.ok) {
    return NextResponse.json({ error: 'Failed to fetch emojis' }, { status: 500 });
  }

  return NextResponse.json(data.emoji); // Only return emoji map
}