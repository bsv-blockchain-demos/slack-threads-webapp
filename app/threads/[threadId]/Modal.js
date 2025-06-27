'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ onClose, thread, messageTS, publicKey, paymail }) {
    const [amount, setAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    
    // Close modal when Escape key is pressed
    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        
        document.addEventListener('keydown', handleEscKey);
        return () => document.removeEventListener('keydown', handleEscKey);
    }, [onClose]);
    
    // Prevent scrolling of background content when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
            setError('Please enter a valid amount')
            return
        }

        setIsSubmitting(true)
        setError('')

        try {
            const res = await fetch('/api/tip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseInt(amount),
                    thread: thread,
                    messageTS,
                    senderPublicKey: publicKey,
                    paymail: paymail,
                }),
            })

            const result = await res.json()

            if (res.ok) {
                setSuccess(true)
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError(result.error || 'Failed to send tip')
            }
        } catch (err) {
            console.error('Network error:', err)
            setError('Network error. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Use React Portal to render the modal outside the normal DOM hierarchy
    // This ensures it appears as an overlay on top of everything else
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    
    // Only render the portal on the client side
    if (!mounted) return null;
    
    return createPortal(
        <>
            <div className="fixed inset-0 backdrop-blur-sm bg-opacity-30 z-50 bsv-animate-fade" onClick={onClose}></div>
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bsv-animate-slide"
            style={{
                border: '1px solid var(--bsv-border-medium)',
                borderRadius: 'var(--bsv-border-radius-md)',
                boxShadow: '10px 10px gray',
            }}>
                <div className="bsv-card bg-white p-6 rounded-lg shadow-lg w-96">
                <div className="flex justify-between items-center mb-4 border-b border-bsv-border-light pb-3">
                    <h2 style={{ color: 'var(--bsv-primary)', fontWeight: 600, fontSize: '1.5rem' }}>Send a Tip</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label="Close"
                        style={{ cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>
                
                {success ? (
                    <div className="text-center py-4">
                        <div className="text-4xl mb-2">🎉</div>
                        <p style={{ color: 'var(--bsv-success)' }}>Tip sent successfully!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label 
                                htmlFor="amount" 
                                className="block mb-2 text-sm font-medium"
                                style={{ color: 'var(--bsv-text-secondary)' }}
                            >
                                Amount
                            </label>
                            <input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount in satoshis"
                                className="bsv-input w-full"
                                style={{
                                    borderColor: 'var(--bsv-border-medium)',
                                    borderRadius: 'var(--bsv-border-radius-md)',
                                    padding: 'var(--bsv-spacing-2) var(--bsv-spacing-3)',
                                    color: 'var(--bsv-text-primary)',
                                }}
                                required
                                min="1"
                            />
                        </div>
                        
                        {error && (
                            <div 
                                className="mb-4 p-3 rounded-md" 
                                style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)', color: 'var(--bsv-danger)' }}
                            >
                                {error}
                            </div>
                        )}
                        
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="bsv-button-outline"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--bsv-primary)',
                                    cursor: 'pointer',
                                    border: '1px solid var(--bsv-primary)',
                                    borderRadius: 'var(--bsv-border-radius-md)',
                                    padding: 'var(--bsv-spacing-2) var(--bsv-spacing-4)',
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="bsv-button"
                                style={{
                                    backgroundColor: 'var(--bsv-primary)',
                                    color: 'var(--bsv-text-light)',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--bsv-border-radius-md)',
                                    padding: 'var(--bsv-spacing-2) var(--bsv-spacing-4)',
                                }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : 'Send Tip'}
                            </button>
                        </div>
                    </form>
                )}
                </div>
            </div>
        </>,
        document.body
    );
}
