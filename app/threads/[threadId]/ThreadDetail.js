'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SlackImage } from '../../../src/components/slackImage';
import { convertSlackMarkdown } from '../../../src/components/ThreadList';
import Link from 'next/link';
import { createVoteToken, connectWallet, redeemVote } from '../../../src/components/walletServiceHooks';
import { useState, useEffect } from 'react';

export default function ThreadDetail({ thread }) {
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [userPublicKey, setUserPublicKey] = useState(null);

  const question = thread?.messages?.[0] || null;
  const answers = thread?.messages?.slice(1) || [];

  useEffect(() => {
    const initWallet = async () => {
      try {
        const walletInstance = await connectWallet();
        setWallet(walletInstance);
        if (walletInstance) {
          if (!userPublicKey) {
            const publicKey = await walletInstance.getPublicKey({ identityKey: true });
            setUserPublicKey(publicKey);
            console.log('User public key:', userPublicKey);
          }
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    };
    
    initWallet();
  }, []);

  if (!thread) return <div className="error">Thread not found</div>;

  const handleUpvote = async (messageTS, type) => {
    if (loading) return;
    setLoading(true);

    if (!wallet) {
      console.error('Wallet not connected');
      setLoading(false);
      return;
    }

    // Check if user has already voted
    let userUpvote;
    if (type === 'question') {
      userUpvote = question?.votes?.upvotes?.find(upvote => upvote.publicKey === userPublicKey);
    } else {
      const answer = answers.find(answer => answer.ts === messageTS);
      userUpvote = answer?.votes?.upvotes?.find(upvote => upvote.publicKey === userPublicKey);
    }

    if (userUpvote) {
      try {
        await redeemVote('upvotes', userUpvote.txID);
        // Change upvote info in DB
        await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageTS,
            voteType: 'upvotes',
            publicKey: userPublicKey,
            txID: userUpvote.txID,
            answers,
            redeem: true,
          })
        })
      } catch (error) {
        console.error('Error redeeming vote:', error);
      } finally {
        setLoading(false);
        return;
      }
    }

    // Create upvote token
    try {
      const response = await createVoteToken('upvotes');
      console.log('Upvote token created:', response);

      const txID = response.txid;

      // Put txID and userPublicKey in MongoDB
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageTS,
          voteType: 'upvotes',
          publicKey: userPublicKey,
          txID,
          answers,
        })
      })

    } catch (error) {
      console.error('Error creating upvote token:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownvote = async (messageTS, type) => {
    if (loading) return;
    setLoading(true);

    if (!wallet) {
      console.error('Wallet not connected');
      setLoading(false);
      return;
    }

    // Check if user has already voted
    let userDownvote;
    if (type === 'question') {
      userDownvote = question?.votes?.downvotes?.find(downvote => downvote.publicKey === userPublicKey);
    } else {
      const answer = answers.find(answer => answer.ts === messageTS);
      userDownvote = answer?.votes?.downvotes?.find(downvote => downvote.publicKey === userPublicKey);
    }

    if (userDownvote) {
      try {
        await redeemVote('downvotes', userDownvote.txID);
        // Change downvote info in DB
        await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageTS,
            voteType: 'downvotes',
            publicKey: userPublicKey,
            txID: userDownvote.txID,
            answers,
            redeem: true,
          })
        })
      } catch (error) {
        console.error('Error redeeming vote:', error);
      } finally {
        setLoading(false);
        return;
      }
    }

    // Create downvote token
    try {
      const response = await createVoteToken('downvotes');
      console.log('Downvote token created:', response);

      const txID = response.txid;

      // Put txID and userPublicKey in MongoDB
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageTS,
          voteType: 'downvotes',
          publicKey: userPublicKey,
          txID,
          answers,
        })
      })

    } catch (error) {
      console.error('Error creating downvote token:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="thread-detail-container">
      {/* Question Header */}
      <div className="thread-header">
        <h1>
          {question ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {convertSlackMarkdown(question.text)}
            </ReactMarkdown>
          ) : (
            'No question'
          )}
        </h1>
        <div className="thread-metadata">
          <span>
            asked {thread.saved_at ? new Date(thread.saved_at).toLocaleString() : 'unknown date'}
          </span>
          <span>by {thread.saved_by_info?.real_name || 'Anonymous'}</span>
        </div>
      </div>

      {/* Question Body */}
      <div className="question-section">
        <div className="vote-container">
          <button 
            className={`vote-button ${question?.votes?.upvotes?.find(upvote => upvote.publicKey === userPublicKey) ? 'voted' : ''}`} 
            onClick={() => handleUpvote(question.ts, 'question')}
          >▲</button>
          <span className="vote-count">{(question.votes?.upvotes?.length - question.votes?.downvotes?.length) || 0}</span>
          <button 
            className={`vote-button ${question?.votes?.downvotes?.find(downvote => downvote.publicKey === userPublicKey) ? 'voted' : ''}`} 
            onClick={() => handleDownvote(question.ts, 'question')}
          >▼</button>
        </div>
        <div className="question-content">
          <div className="markdown-content">
            {question && (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {convertSlackMarkdown(question.text)}
              </ReactMarkdown>
            )}
          </div>
          {question?.userInfo && (
            <div className="user-card">
              <div className="user-info">
                <div className="user-avatar">
                  {question.userInfo.real_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="user-name">{question.userInfo.real_name}</div>
                  <div className="user-timestamp">
                    asked {thread.saved_at ? new Date(thread.saved_at).toLocaleString() : 'unknown'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Answers */}
      <div className="answers-section">
        <div className="answers-header">
          <h2>Answers <span className="answers-count">{answers.length}</span></h2>
        </div>

        {answers.map((answer, index) => {
          const files = answer?.raw?.files || [];
          const maxReactions = Math.max(...answers.map(a => a.reactions?.length || 0));
          const isBestAnswer = answer.reactions?.length === maxReactions && maxReactions > 0;

          return (
            <div key={index} className={`answer-section ${isBestAnswer ? 'best-answer' : ''}`}>
              <div className="vote-container">
                <button 
                  className={`vote-button ${answer?.votes?.upvotes?.find(upvote => upvote.publicKey === userPublicKey) ? 'voted' : ''}`} 
                  onClick={() => handleUpvote(answer.ts, 'answer')}
                >▲</button>
                <span className="vote-count">{(answer.votes?.upvotes?.length - answer.votes?.downvotes?.length) || 0}</span>
                <button 
                  className={`vote-button ${answer?.votes?.downvotes?.find(downvote => downvote.publicKey === userPublicKey) ? 'voted' : ''}`} 
                  onClick={() => handleDownvote(answer.ts, 'answer')}
                >▼</button>
              </div>
              <div className="answer-content">
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {convertSlackMarkdown(answer.text || 'No content')}
                  </ReactMarkdown>
                </div>
                {files.length > 0 && (
                  <div className="answer-files">
                    {files.map((file, fileIndex) => (
                      <div key={`file_${index}_${fileIndex}`} className="answer-file">
                        {file.url_private ? (
                          <div className="answer-file-image">
                            <SlackImage file={file} />
                          </div>
                        ) : (
                          <div className="answer-file-placeholder">
                            <span className="file-icon">📁</span>
                            <div className="file-info">
                              <span className="file-name">{file.name || 'File'}</span>
                              <span className="file-type">{file.mimetype || 'Unknown type'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {answer.userInfo && (
                  <div className="user-card">
                    <div className="user-info">
                      <div className="user-avatar">
                        {answer.userInfo.real_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="user-name">{answer.userInfo.real_name}</div>
                        <div className="user-timestamp">
                          answered {answer.ts ? new Date(answer.ts * 1000).toLocaleString() : 'unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="back-link">
        <Link href="/">← Back to all threads</Link>
      </div>
    </div>
  );
}
