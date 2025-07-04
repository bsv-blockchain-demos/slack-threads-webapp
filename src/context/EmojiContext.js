'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const EmojiContext = createContext({});

export const useEmojiMap = () => useContext(EmojiContext);

export function EmojiProvider({ children }) {
    const [emojiMap, setEmojiMap] = useState({});

    useEffect(() => {
        try {
            const fetchEmojiList = async () => {
                const response = await fetch('/api/emoji-list');
                const data = await response.json();
                setEmojiMap(data);
            };
            fetchEmojiList();
        } catch (error) {
            console.error('Failed to fetch emoji list:', error);
        }
    }, []);

    return (
        <EmojiContext.Provider value={emojiMap}>
            {children}
        </EmojiContext.Provider>
    );
}
