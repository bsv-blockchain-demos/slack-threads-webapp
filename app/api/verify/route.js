import { NextResponse } from 'next/server'
import { Hash, Utils, LookupResolver } from '@bsv/sdk';

export async function POST(req) {
    try {
        const { thread } = await req.json();
        console.log('API verify route called', thread);

        if (!thread) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create fileHash to compare with txFileHash
        const filteredThread = createFilteredThreadInfo({ thread_ts: thread.ts, channel: thread.channel, saved_by: thread.saved_by, messages: thread.messages });
        const fileHash = Hash.sha256(Utils.toArray(JSON.stringify(filteredThread), "utf8"));

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
                return NextResponse.json({ message: 'Integrity check passed for thread ' + thread + ' and hash ' + fileHash }, { success: true }, { status: 200 });
            } else {
                return NextResponse.json({ message: 'Integrity check failed for thread ' + thread + ' and hash ' + fileHash }, { success: false }, { status: 400 });
            }
        }

        return NextResponse.json({ message: 'Integrity check failed for thread ' + thread + ' and hash ' + fileHash, }, { success: false }, { status: 400 });
    } catch (error) {
        console.error('API verify route error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { success: false }, { status: 500 });
    }
}

function filterThreadMessages(messages) {
    return messages.map(({ text, ts }) => ({ text, ts }));
}

function createFilteredThreadInfo({ thread_ts, channel, saved_by, messages }) {
    return {
        thread_ts,
        channel,
        saved_by,
        messages: filterThreadMessages(messages),
    };
}