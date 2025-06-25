import { NextResponse } from 'next/server'
import dbConnect from '../../../src/lib/db'
import mongoose from 'mongoose'
import { ProtoWallet } from '@bsv/sdk';
import { Utils } from '@bsv/sdk';

console.log('API /api/vote loaded');

export async function POST(req) {
    console.log('API vote route called')

    try {
        const body = await req.json()
        console.log('Request body:', body)

        const { messageTS, voteType, publicKey, signature, thread: threadData, delete: deleteVote, keyID } = body

        if (!messageTS || !voteType || !publicKey || !signature || !threadData || !keyID) {
            console.error('Missing required fields')
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify signature
        const serverWallet = new ProtoWallet("anyone");
        const { valid } = await serverWallet.verifySignature({
            counterparty: publicKey,
            data: Utils.toArray(messageTS + voteType, "utf8"),
            signature,
            protocolID: [0, 'slackthreads'],
            keyID: keyID,
        });
        console.log('Signature verified:', valid)

        if (!valid) {
            console.error('Invalid signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        await dbConnect()
        console.log('Database connected')

        // Get the thread ID from the thread data
        const threadId = threadData._id
        console.log('Thread ID:', threadId)

        // Access the collection directly instead of using the model
        const threadsCollection = mongoose.connection.db.collection('threads')

        // Find the thread by its ID
        const thread = await threadsCollection.findOne({ _id: threadId })

        if (!thread) {
            console.error('Thread not found with ID:', threadId)
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
        }

        console.log('Thread found, looking for message with ts:', messageTS)

        // Locate the message inside the thread
        const message = thread.messages.find(msg => msg.ts === messageTS)

        if (!message) {
            console.error('Message not found with ts:', messageTS)
            console.log('Available message timestamps:', thread.messages.map(m => m.ts))
            return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }

        console.log('Message found, processing vote')

        // Ensure votes structure is present
        if (!message.votes) {
            console.log('Initializing votes structure')
            message.votes = { upvotes: [], downvotes: [] }
        }
        if (!message.votes[voteType]) {
            console.log(`Initializing ${voteType} array`)
            message.votes[voteType] = []
        }

        if (deleteVote) {
            console.log('Deleting vote')
            // Remove vote
            message.votes[voteType] = message.votes[voteType].filter(
                (vote) => vote.publicKey !== publicKey
            )
        } else {
            console.log('Adding vote')
            // Add vote
            message.votes[voteType].push({ publicKey: publicKey })
            console.log('Vote added successfully')
        }

        // Save back to DB using updateOne
        console.log('Updating database...')
        await threadsCollection.updateOne(
            { _id: threadId },
            { $set: { messages: thread.messages } }
        )

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('API DB Error:', err)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
}
