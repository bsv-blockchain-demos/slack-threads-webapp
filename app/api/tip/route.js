import { NextResponse } from 'next/server'
import dbConnect from '../../../src/lib/db'
import mongoose from 'mongoose';
import { connectWallet, resolvePaymail } from '../../../src/components/walletServiceHooks';

export async function POST(req) {
    console.log('API tip route called');

    try {
        const body = await req.json();
        console.log('Request body:', body);

        const { thread, amount, senderPublicKey, messageTS, paymail } = body;

        if (!thread || !amount || !senderPublicKey || !messageTS || !paymail) {
            console.error('Missing required fields');
            // Return error showing missing field
            return NextResponse.json({ error: `Missing required fields: ${amount ? '' : 'amount '}${senderPublicKey ? '' : 'senderPublicKey, Is a Wallet client open?'}` }, { status: 400 });
        }

        await dbConnect();
        console.log('Database connected');

        // Locate the message inside the thread
        const message = thread.messages.find(msg => msg.ts === messageTS);

        if (!message) {
            console.error('Message not found with ts:', messageTS);
            console.log('Available message timestamps:', thread.messages.map(m => m.ts));
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        const receiver = message?.user;
        console.log('Receiver:', receiver);

        // Temp to test Modal
        return NextResponse.json({ success: true });    

        // Create transaction using wallet publicKey and receiver PayMail
        const paymailAddress = resolvePaymail(paymail);

        const wallet = connectWallet();

        // Check wallet balance
        const balance = await wallet.getBalance();

        if (balance < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }

        const transaction = await wallet.createAction({
            description: 'Tip',
            outputs: [{
                address: paymailAddress,
                amount,
            }],
        });
        const signedAction = await walletClient.signAction(transaction);

        const txid = transaction.id;
        
        // Get tipsCollection
        const tipsCollection = mongoose.connection.db.collection('tips');

        // Get timestamp
        const timestamp = new Date().toISOString();

        // Update the tip in db
        await tipsCollection.updateOne(
            { _id: messageTS },
            {
                $push: { 'tips': { fromPublicKey: publicKey, amount, to: receiver, receiverAddress: paymailAddress, timestamp, txid } }
            },
            { upsert: true }
        )

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing tip:', error);
        return NextResponse.json({ error: 'Error processing tip' }, { status: 500 });
    }
}