"use client";

import { useEffect, useState, useRef } from 'react';
import { connectWallet } from '../components/walletServiceHooks';
import { toast } from 'react-hot-toast';
import { createContext, useContext } from 'react';

export const WalletContext = createContext();

export const useWalletContext = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
    const [wallet, setWallet] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [userPublicKey, setUserPublicKey] = useState('');
    const hasAlertedRef = useRef(false);

    useEffect(() => {
        const initWallet = async () => {
            try {
                const walletInstance = await connectWallet();
                setWallet(walletInstance);
                if (walletInstance) {
                    setIsConnected(true);
                    if (!userPublicKey) {
                        const publicKey = await walletInstance.getPublicKey({ identityKey: true });
                        setUserPublicKey(publicKey.publicKey);
                        toast((t) => (
                            <div
                                style={{
                                    background: '#f0fdf4',
                                    color: '#15803d',
                                    padding: '12px 32px 12px 16px',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    maxWidth: '400px',
                                    fontSize: '14px',
                                    border: '1px solid #bbf7d0',
                                }}
                            >
                                {/* Success icon */}
                                <span
                                    style={{
                                        marginRight: '8px',
                                        fontSize: '16px',
                                    }}
                                >
                                    ✅
                                </span>
                                
                                {/* Dismiss button */}
                                <button
                                    onClick={() => toast.dismiss(t.id)}
                                    style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#15803d',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                    }}
                                    aria-label="Close"
                                >
                                    ×
                                </button>

                                {/* Success message */}
                                <strong>Wallet connected successfully!</strong>
                                <br />
                                <span style={{ fontSize: '12px', opacity: 0.8 }}>
                                    You're ready to interact with the app.
                                </span>
                            </div>
                        ), {
                            duration: 4000,
                            position: 'top-center',
                            id: 'wallet-connect-success',
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to connect wallet:', error);
                // Show popup message
                if (!hasAlertedRef.current) {
                    toast((t) => (
                        <div
                            style={{
                                background: '#fef2f2',
                                color: '#b91c1c',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                position: 'relative',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                maxWidth: '400px',
                                whiteSpace: 'pre-line',
                                fontSize: '14px',
                            }}
                        >
                            {/* Dismiss button */}
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#b91c1c',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                }}
                                aria-label="Close"
                            >
                                ×
                            </button>

                            {/* Message with hyperlink */}
                            Failed to connect wallet.{"\n"}
                            To interact with the app, please open a wallet client.{" "}
                            <a
                                href="https://metanet.bsvb.tech"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'underline', color: '#b91c1c', fontWeight: 'bold' }}
                            >
                                Learn more
                            </a>
                        </div>
                    ), {
                        duration: 8000,
                        position: 'top-center',
                        id: 'wallet-connect-error',
                    });
                    hasAlertedRef.current = true;
                }
            }
        };

        initWallet();
    }, []);

    return (
        <WalletContext.Provider value={{ wallet, isConnected, userPublicKey }}>
            {children}
        </WalletContext.Provider>
    );
}