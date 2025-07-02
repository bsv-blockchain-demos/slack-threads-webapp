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