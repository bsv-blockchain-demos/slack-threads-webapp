import { NextResponse } from 'next/server'
import { Hash, Utils, LookupResolver, Transaction } from '@bsv/sdk';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const randomSecret = process.env.RANDOM_SECRET;

let verifyCache = globalThis._slackthreadsVerifyCache;

if (!verifyCache) {
    verifyCache = globalThis._slackthreadsVerifyCache = new Map();
}

function getCachedVerification(cacheKey) {
    const entry = verifyCache.get(cacheKey);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        verifyCache.delete(cacheKey);
        return null;
    }
    return entry.value;
}

function setCachedVerification(cacheKey, value, ttlMs) {
    verifyCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + ttlMs,
    });
}

async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length);
    let index = 0;

    async function worker() {
        while (true) {
            const currentIndex = index++;
            if (currentIndex >= items.length) return;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    }

    const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
    await Promise.all(workers);
    return results;
}

export async function POST(req) {
    try {
        const { threads } = await req.json();

        if (!Array.isArray(threads)) {
            return NextResponse.json({ error: 'threads must be an array' }, { status: 400 });
        }

        const ttlMs = Number(process.env.VERIFY_CACHE_TTL_MS) || 5 * 60 * 1000;
        const concurrency = Number(process.env.VERIFY_CONCURRENCY) || 5;

        const results = await mapWithConcurrency(threads, concurrency, async (thread) => {
            const cacheKey = `${thread?._id ?? ''}:${thread?.last_updated ?? ''}`;
            const cached = getCachedVerification(cacheKey);
            if (cached !== null) {
                return { threadId: thread._id, success: cached };
            }

            try {
                const valid = await verifyThreadIntegrity(thread);
                setCachedVerification(cacheKey, Boolean(valid.success), ttlMs);
                return { threadId: thread._id, success: valid.success };
            } catch {
                setCachedVerification(cacheKey, false, ttlMs);
                return { threadId: thread._id, success: false };
            }
        });

        return NextResponse.json({ results }, { status: 200 });
    } catch (error) {
        console.error('API verify route error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

async function verifyThreadIntegrity(thread) {
    // Create fileHash to compare with txFileHash
    const filteredThread = createFilteredThreadInfo({ thread_ts: thread._id, channel: thread.channel, saved_by: thread.saved_by, last_updated: thread.last_updated, messages: thread.messages });
    const fileHash = Hash.hash256(Utils.toArray(JSON.stringify(filteredThread) + randomSecret, "utf8"));
    const hashHexString = Utils.toHex(fileHash);

    // Get transaction from overlay
    const overlay = new LookupResolver()

    const response = await overlay.query({
        service: 'ls_slackthread', query: {
            threadHash: hashHexString
        }
    }, 10000);

    // Return true if all checks pass
    // lockingScript.chunks[1].data = threadHash (num array)
    if (response.outputs.length > 0) {
        return { message: 'Integrity check passed for thread ' + thread._id + ' and hash ' + hashHexString, success: true };
    } else {
        return { message: 'Integrity check failed for thread ' + thread._id + ' and hash ' + hashHexString, success: false };
    }
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