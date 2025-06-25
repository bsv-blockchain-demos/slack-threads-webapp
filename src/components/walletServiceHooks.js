import { Script, WalletClient, Utils } from '@bsv/sdk';        

export async function connectWallet() {
    // Connect to wallet with BEEF capabilities
    const wallet = new WalletClient('auto', 'localhost:3000'); //TODO: Add new Metanet App
    const isConnected = await wallet.isAuthenticated();

    if (isConnected) {
        return wallet;
    }

    return null;
}

export async function signVote(messageTS, type, keyID) {
    const wallet = await connectWallet();

    if (!wallet) {
        throw new Error('Wallet not connected');
    }

    // Sign vote
    const { signature } = await wallet.createSignature({
        data: Utils.toArray(messageTS + type, "utf8"),
        keyID: keyID,
        protocolID: [0, 'slackthreads'],
    });
    return signature;
}

// TODO: Create function to verify thread validity with endpoint (createActionResponse)

// export async function createVoteToken(type) {
//     const wallet = await connectWallet();

//     if (!wallet) {
//         throw new Error('Wallet not connected');
//     }

//     let response;

//     // Create atomic operation
//     response = await wallet.createAction({
//         description: `Create ${type} token`,
//         outputs: [{
//             satoshis: 1,
//             lockingScript: Script.fromASM('OP_NOP').toHex(), //TODO: scriptTemplate
//             basket: type,
//             outputDescription: `${type} token`
//         }]
//     });


//     // Wallet returns BEEF format for P2P transmission
//     // Contains all SPV data needed for instant verification
//     return response;
// }

// export async function redeemVote(type, txID) {
//     const wallet = await connectWallet();

//     if (!wallet) {
//         throw new Error('Wallet not connected');
//     }

//     //TODO: List all Outpoints and find the correct one using the MongoDB txID
//     const outpoints = await wallet.listOutpoints({ basket: type, include: "entire transactions" });
//     const txBEEF = outpoints.BEEF;
//     const voteOutpoint = outpoints.outputs.find(output => output.outpoint.strip('.')[0] === txID);

//     // Redeem vote
//     const response = await wallet.createAction({
//         description: 'Redeem vote',
//         inputBEEF: txBEEF,
//         inputs: [{
//             inputDescription: 'Redeem vote',
//             unlockingScript: Script.fromASM('OP_TRUE').toHex(), //TODO: scriptTemplate
//             outpoint: voteOutpoint.outpoint,
//         }]
//     });

//     // Wallet returns BEEF format for P2P transmission
//     // Contains all SPV data needed for instant verification
//     return response;
// }