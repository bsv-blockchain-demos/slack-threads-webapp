import { NextResponse } from 'next/server'
import { Hash, Utils, LookupResolver } from '@bsv/sdk';
import dotenv from 'dotenv';
dotenv.config();

const randomSecret = process.env.RANDOM_SECRET;

export async function POST(req) {
    try {
        const { threads } = await req.json();

        if (!Array.isArray(threads)) {
            return NextResponse.json({ error: 'threads must be an array' }, { status: 400 });
        }

        const results = await Promise.all(
            threads.map(async (thread) => {
                try {
                    const valid = await verifyThreadIntegrity(thread); // your existing check
                    return { threadId: thread._id, success: valid.success };
                } catch {
                    return { threadId: thread._id, success: false };
                }
            })
        );

        return NextResponse.json({ results }, { status: 200 });
    } catch (error) {
        console.error('API verify route error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

async function verifyThreadIntegrity(thread) {
    // Create fileHash to compare with txFileHash
    const filteredThread = createFilteredThreadInfo({ thread_ts: thread.ts, channel: thread.channel, saved_by: thread.saved_by, last_updated: thread.last_updated, messages: thread.messages });
    const fileHash = Hash.hash256(Utils.toArray(JSON.stringify(filteredThread) + randomSecret, "utf8"));

    // Get transaction from overlay
    const overlay = new LookupResolver()

    const response = await overlay.query({
        service: 'ls_slackthread', query: {
            threadHash: fileHash
        }
    }, 10000);
    console.log('Response:', response);

    // Return true if all checks pass
    // lockingScript.chunks[1].data = threadHash (num array)
    if (response.outputs.length > 0) {
        const lockingScript = response.outputs[0].lockingScript; //TODO: Get actual locking script from tx
        const threadHash = lockingScript.chunks[1].data;
        if (threadHash === fileHash) {
            return { message: 'Integrity check passed for thread ' + thread + ' and hash ' + fileHash, success: true };
        } else {
            return { message: 'Integrity check failed for thread ' + thread + ' and hash ' + fileHash, success: false };
        }
    }

    return { message: 'Integrity check failed for thread ' + thread + ' and hash ' + fileHash, success: false };
}

function filterThreadMessages(messages) {
    return messages.map(({ text, ts }) => ({ text, ts }));
}

function createFilteredThreadInfo({ thread_ts, channel, saved_by, last_updated, messages }) {
    return {
        thread_ts,
        channel,
        saved_by,
        last_updated,
        messages: filterThreadMessages(messages),
    };
}