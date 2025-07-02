import { NextResponse } from 'next/server'
import dbConnect from '../../../src/lib/db'
import mongoose from 'mongoose';
import { connectWallet } from '../../../src/components/walletServiceHooks';
import { P2PKH, Hash } from '@bsv/sdk';
import { PaymailClient } from '@bsv/paymail';

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

        //Create transaction using wallet publicKey and receiver PayMail
        const paymailPubKey = resolvePaymail(paymail);
        const paymailHash = Hash.sha256(paymailPubKey);
        const paymailAddress = Hash.ripemd160(paymailHash);
        console.log('Paymail address:', paymailAddress); 

        const wallet = await connectWallet();

        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not connected' }, { status: 400 });
        }

        // Check wallet balance
        const balance = await wallet.getBalance();
        console.log('Wallet balance:', balance);

        // Temp to test Modal
        return NextResponse.json({ success: true });

        if (balance < amount + 10) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }

        const transaction = await wallet.createAction({
            description: 'Tip',
            outputs: [{
                lockingScript: new P2PKH().lock(paymailAddress),
                amount,
            }],
        });
        const signedAction = await wallet.signAction(transaction);

        const txid = signedAction.txid;
        
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

async function resolvePaymail(paymail) {
    const client = new PaymailClient();
    const pki = await client.getPki(paymail);
    return pki.pubkey;
}