import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

console.log('SLACK_BOT_TOKEN :', SLACK_BOT_TOKEN);

export default async function (req, res) {
    const { image } = req.params;

    if (!image) {
        return res.status(400).json({ error: 'Missing privateUrl in request body.' });
    }

    try {
        const imageUrl = `https://files.slack.com/${decodeURIComponent(image)}`;
        console.log('Fetching image from Slack:', imageUrl);
        const slackRes = await fetch(imageUrl, {
            headers: {
                Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
            }
        });

        if (!slackRes.ok) {
            return res.status(slackRes.status).json({ error: 'Failed to fetch image from Slack.' });
        }

        // const contentType = slackRes.headers.get('content-type');
        // if (!contentType || !contentType.startsWith('image/')) {
        //     return res.status(400).json({ error: 'Invalid image format.' });
        // }

        // print out the body
      // console.log('Slack image body:', await slackRes.text());

        // Stream image directly to response
        res.setHeader('Content-Type', slackRes.headers.get('content-type') || 'image/jpeg');
        slackRes.body.pipe(res);
    } catch (err) {
        console.error('Slack image fetch failed:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
