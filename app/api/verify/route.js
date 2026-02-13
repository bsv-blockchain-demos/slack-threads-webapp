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

const SWEEP_TRIGGER_THRESHOLD = 100;

function sweepExpiredVerifyCache() {
    const now = Date.now();
    for (const [key, entry] of verifyCache.entries()) {
        if (!entry || entry.expiresAt <= now) {
            verifyCache.delete(key);
        }
    }
}

function getOrSetVerification(cacheKey, ttlMs, verifierFn) {
    if (ttlMs <= 0) {
        return verifierFn();
    }

    if (verifyCache.size >= SWEEP_TRIGGER_THRESHOLD) {
        sweepExpiredVerifyCache();
    }

    const cached = verifyCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const promise = Promise.resolve()
        .then(() => verifierFn())
        .catch((err) => {
            verifyCache.delete(cacheKey);
            throw err;
        });

    verifyCache.set(cacheKey, {
        value: promise,
        expiresAt: Date.now() + ttlMs,
    });

    return promise;
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
            const successPromise = getOrSetVerification(cacheKey, ttlMs, async () => {
                try {
                    const valid = await verifyThreadIntegrity(thread);
                    return Boolean(valid.success);
                } catch {
                    return false;
                }
            });

            const success = await successPromise;
            return { threadId: thread._id, success };
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