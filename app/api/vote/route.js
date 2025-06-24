import { NextResponse } from 'next/server'
import dbConnect from '../../../src/lib/db'
import Thread from '../../../src/models/Thread'

console.log('API /api/vote loaded');

export async function POST(req) {
    const body = await req.json()

    const { messageTS, voteType, publicKey, txID, answers, redeem } = body

    if (!messageTS || !voteType || !publicKey || !txID || !answers) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
        await dbConnect()

        const threadTS = answers[0].ts
        const thread = await Thread.findOne({ 'threads._id': threadTS })

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
        }

        // Locate the message inside the thread
        const message = thread.messages.find(msg => msg.ts === messageTS)

        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }

        // Ensure votes structure is present
        if (!message.votes) {
            message.votes = { upvotes: [], downvotes: [] }
        }
        if (!message.votes[voteType]) {
            message.votes[voteType] = []
        }

        if (redeem) {
            // Remove vote
            message.votes[voteType] = message.votes[voteType].filter(
                (vote) => vote.publicKey !== publicKey
            )
        } else {
            // Add vote
            message.votes[voteType].push({ publicKey, txID })
        }

        // Save back to DB
        await thread.save()

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('API DB Error:', err)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
}
