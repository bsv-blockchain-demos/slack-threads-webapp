import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

export async function GET(request, { params }) {
  const { image } = await params;

  if (!image) {
    return NextResponse.json({ error: 'Missing image parameter.' }, { status: 400 });
  }

  try {
    const imageUrl = `https://files.slack.com/${decodeURIComponent(image)}`;
    console.log('Fetching image from Slack:', imageUrl);

    const slackRes = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    });

    if (!slackRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch image from Slack.' }, { status: slackRes.status });
    }

    const contentType = slackRes.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await slackRes.arrayBuffer();

    return new NextResponse(Buffer.from(imageBuffer), {
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (err) {
    console.error('Slack image fetch failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}