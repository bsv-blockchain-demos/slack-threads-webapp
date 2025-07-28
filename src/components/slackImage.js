import React from 'react';
import { useState, useEffect } from 'react';

export const getSlackImageBlob = async (privateUrl) => {
    const encodedPath = encodeURIComponent(
      privateUrl.replace('https://files.slack.com/', '')
    );
  
    const response = await fetch(`/api/image/${encodedPath}`);
  
    if (!response.ok) {
      throw new Error('Failed to fetch Slack image');
    }
  
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

export const SlackImage = ({ file }) => {
    const [blob, setBlob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchImage = async () => {
            try {
                const blob = await getSlackImageBlob(file.url_private_download);
                setBlob(blob);
                setLoading(false);
            } catch (error) {
                setError(error);
                setLoading(false);
            }
        };
        fetchImage();
    }, [file]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    // eslint-disable-next-line
    return <img src={blob} alt="Slack Image" />;
};
