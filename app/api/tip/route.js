import { NextResponse } from 'next/server'
import dbConnect from '../../../src/lib/db'
import mongoose from 'mongoose';
import { connectWallet } from '../../../src/components/walletServiceHooks';
import { Transaction, Utils, Random, Hash } from '@bsv/sdk';
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

        const wallet = await connectWallet();

        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not connected' }, { status: 400 });
        }

        // Check wallet balance
        // const balance = await wallet.getBalance();
        // console.log('Wallet balance:', balance);

        // if (balance < amount + 10) {
        //     return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        // }

        //Create transaction using wallet publicKey and receiver PayMail
        const paymailDestinations = await resolvePaymail(paymail, amount);
        console.log('Paymail destinations:', paymailDestinations);
        const reference = paymailDestinations.reference;

        const totalAmount = paymailDestinations.outputs.reduce((total, destination) => total + destination.satoshis, 0);

        if (totalAmount !== amount) {
            return NextResponse.json({ error: 'Amount does not match' }, { status: 400 });
        }

        const transaction = await wallet.createAction({
            description: 'Tip',
            outputs: paymailDestinations.outputs.map((destination) => ({
                lockingScript: destination.script,
                satoshis: destination.satoshis,
                outputDescription: `Tip to ${paymail}`,
            })),
        });
        //const signedAction = await wallet.signAction(transaction);

        const txid = transaction.txid;

        // Get tipsCollection
        const tipsCollection = mongoose.connection.db.collection('tips');

        // Get timestamp
        const timestamp = new Date().toISOString();

        // Update the tip in db
        await tipsCollection.updateOne(
            { _id: messageTS },
            {
                $push: { 'tips': { fromPublicKey: senderPublicKey, amount, to: receiver, receiverAddress: reference, timestamp, txid } }
            },
            { upsert: true }
        )

        // Send transaction to paymail
        const rawTx = Transaction.fromBEEF(transaction.tx).toHex();
        const response = await paymailSendTransaction(paymail, rawTx, reference, txid);
        console.log('Transaction response:', response);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing tip:', error);
        return NextResponse.json({ error: 'Error processing tip' }, { status: 500 });
    }
}

async function resolvePaymail(paymail, amount) {
    const client = new PaymailClient();
    const destination = await client.getP2pPaymentDestination(paymail, amount);
    return destination;
}

async function paymailSendTransaction(paymail, hex, reference, txid) {
    const client = new PaymailClient();
    const wallet = await connectWallet();
    const keyID = Utils.toHex(Random(8));

    const txArray = Utils.toArray(txid, 'utf8');
    const txHash = Hash.hash256(txArray);
    
    const derivedPublicKey = await wallet.getPublicKey({ protocolID: [0, 'slackthreads'], keyID });

    const { signature } = await wallet.createSignature({
        hashToDirectlySign: txHash,
            data: Utils.toArray("tip", "utf8"),
            keyID: keyID,
            protocolID: [0, 'slackthreads'],
        });

    const metadata = {
        sender: 'Slack Threads',
        pubkey: derivedPublicKey.publicKey,
        note: 'Send tip to ' + paymail,
        signature: signature,
    }
    const response = await client.sendTransactionP2P(paymail, hex, reference, metadata);
    return response;
}