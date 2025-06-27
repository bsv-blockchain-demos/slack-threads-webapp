import { NextResponse } from 'next/server'
import dbConnect from '../../../src/lib/db'
import { ProtoWallet } from '@bsv/sdk';
import { Utils } from '@bsv/sdk';
import mongoose from 'mongoose';

console.log('API /api/vote loaded');

export async function POST(req) {
    console.log('API vote route called')

    try {
        const body = await req.json()
        console.log('Request body:', body)

        const { messageTS, voteType, publicKey, signature, delete: deleteVote, keyID } = body

        if (!messageTS || !voteType || !publicKey || !signature || !keyID) {
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

        const voteCollection = mongoose.connection.db.collection('votes')

        console.log('Processing vote')

        let oppositeVote = voteType === 'upvotes' ? 'downvotes' : 'upvotes';

        const voteField = voteType;
        const oppositeVoteField = oppositeVote;

        if (deleteVote) {
            console.log('Deleting vote')
            // Remove vote
            await voteCollection.updateOne(
                { _id: messageTS },
                {
                    $pull: {
                        [`votes.${voteField}`]: { publicKey: publicKey }
                    }
                },
                { upsert: true }
            );
        } else {
            console.log('Adding vote')
            // Add vote
            await voteCollection.updateOne(
                { _id: messageTS },
                {
                    $addToSet: {
                        [`votes.${voteField}`]: { publicKey: publicKey }
                    },
                    $pull: {
                        [`votes.${oppositeVoteField}`]: { publicKey: publicKey }
                    }
                },
                { upsert: true }
            );
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('API DB Error:', err)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
}
