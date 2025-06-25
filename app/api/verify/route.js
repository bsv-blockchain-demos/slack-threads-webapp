import { NextResponse } from 'next/server'
import { Hash, Utils } from '@bsv/sdk';

export async function GET(req, { params }) {
    try {
        const { thread } = params;
        console.log('API verify route called', thread);

        if (!thread) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create fileHash to compare with txFileHash
        const fileHash = Hash.sha256(Utils.toArray(JSON.stringify(thread), "utf8"));

        // Get txFileHash and verify

        // Verify Merkle path (?)

        // Return true if all checks pass

        return NextResponse.json({ message: 'Integrity check for thread ' + thread + ' and hash ' + fileHash });
    } catch (error) {
        console.error('API verify route error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
