'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SlackImage } from '../../../src/components/slackImage';
import { convertSlackMarkdown } from '../../../src/components/ThreadList';
import Link from 'next/link';
import { connectWallet, signVote } from '../../../src/components/walletServiceHooks';
import { useState, useEffect, useRef } from 'react';
import { Random, Utils } from '@bsv/sdk';
import { toast } from 'react-hot-toast';
import { renderSlackStyleEmojis } from '../../../src/lib/renderEmojis';
import { useEmojiMap } from '../../../src/context/EmojiContext';
import rehypeRaw from 'rehype-raw';

import Modal from './Modal';

export default function ThreadDetail({ thread }) {
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [userPublicKey, setUserPublicKey] = useState('');
  const [selectedMessageTS, setSelectedMessageTS] = useState('');
  const [selectedPaymail, setSelectedPaymail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Optimistic UI update states
  const [optimisticVotes, setOptimisticVotes] = useState({});
  const [optimisticUserVotes, setOptimisticUserVotes] = useState({});

  // Consider revamping this so we don't have duplicate code/functions
  const question = thread?.messages?.[0] || null;
  const answers = thread?.messages?.slice(1) || [];

  const hasAlertedRef = useRef(false);

  const emojiMap = useEmojiMap();

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
            console.log('User public key:', userPublicKey);
          }
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        // Show popup message
        if (!hasAlertedRef.current) {
          toast.error('Failed to connect wallet. \n To interact with the app, please open a wallet client.', {
            duration: 5000,
            position: 'top-center',
            id: 'wallet-connect-error',
          });
          hasAlertedRef.current = true;
        }
      }
    };

    initWallet();
  }, []);

  const handleTipClick = (messageTS, paymail) => {
    setSelectedMessageTS(messageTS);
    setSelectedPaymail(paymail);
    console.log('Handle tip click called');
    setShowModal(true);
  }

  // Initialize optimistic UI states
  useEffect(() => {
    if (thread?.messages && userPublicKey) {
      console.log('Initializing optimistic UI states');
      const initialVotes = {};
      const initialUserVotes = {};

      // Initialize for question
      const question = thread.messages[0];
      if (question) {
        const upvotes = question.votes?.upvotes?.length || 0;
        const downvotes = question.votes?.downvotes?.length || 0;
        initialVotes[question.ts] = upvotes - downvotes;

        initialUserVotes[question.ts] = {
          upvoted: question.votes?.upvotes?.some(vote => vote.publicKey === userPublicKey) || false,
          downvoted: question.votes?.downvotes?.some(vote => vote.publicKey === userPublicKey) || false
        };

        console.log(`Initializing question vote count: ${upvotes} - ${downvotes} = ${initialVotes[question.ts]}`);
      }

      // Initialize for answers
      thread.messages.slice(1).forEach(answer => {
        const upvotes = answer.votes?.upvotes?.length || 0;
        const downvotes = answer.votes?.downvotes?.length || 0;
        initialVotes[answer.ts] = upvotes - downvotes;

        initialUserVotes[answer.ts] = {
          upvoted: answer.votes?.upvotes?.some(vote => vote.publicKey === userPublicKey) || false,
          downvoted: answer.votes?.downvotes?.some(vote => vote.publicKey === userPublicKey) || false
        };

        console.log(`Initializing answer ${answer.ts} vote count: ${upvotes} - ${downvotes} = ${initialVotes[answer.ts]}`);
      });

      setOptimisticVotes(initialVotes);
      setOptimisticUserVotes(initialUserVotes);
      console.log('Optimistic votes initialized:', initialVotes);
    }
  }, [thread, userPublicKey]);

  if (!thread) return <div className="error">Thread not found</div>;

  const handleVote = async (messageTS, direction) => {
    if (loading) return;
    setLoading(true);

    if (!wallet) {
      console.error('Wallet not connected');
      setLoading(false);
      return;
    }

    const isUpvoted = optimisticUserVotes[messageTS]?.upvoted;
    const isDownvoted = optimisticUserVotes[messageTS]?.downvoted;
    let voteChange = 0;
    const isVoteType = direction === 'upvotes';

    // Calculate vote change
    if (isVoteType ? isUpvoted : isDownvoted) {
      voteChange = isVoteType ? -1 : 1;
    } else {
      voteChange = isVoteType
        ? (isDownvoted ? 2 : 1)
        : (isUpvoted ? -2 : -1);
    }

    console.log(`${direction === 'upvotes' ? 'Upvote' : 'Downvote'} action on ${messageTS}: currently upvoted=${isUpvoted}, downvoted=${isDownvoted}, vote change=${voteChange}`);

    // Update optimistic UI
    setOptimisticUserVotes(prev => {
      const newState = { ...prev };
      newState[messageTS] = {
        upvoted: isVoteType ? !isUpvoted : false,
        downvoted: !isVoteType ? !isDownvoted : false,
      };
      return newState;
    });

    setOptimisticVotes(prev => {
      const currentCount = prev[messageTS] ?? 0;
      const newCount = currentCount + voteChange;
      console.log(`Updating vote count for ${messageTS}: ${currentCount} + ${voteChange} = ${newCount}`);
      return { ...prev, [messageTS]: newCount };
    });

    const revertOptimism = () => {
      setOptimisticUserVotes(prev => ({
        ...prev,
        [messageTS]: {
          upvoted: isUpvoted,
          downvoted: isDownvoted,
        },
      }));
      setOptimisticVotes(prev => ({
        ...prev,
        [messageTS]: (prev[messageTS] || 0) - voteChange,
      }));
    };

    // Remove vote
    if ((isVoteType && isUpvoted) || (!isVoteType && isDownvoted)) {
      try {
        const keyID = Utils.toHex(Random(8));
        const signature = await signVote(messageTS, direction, keyID);

        await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageTS,
            voteType: direction,
            publicKey: userPublicKey,
            thread,
            delete: true,
            keyID,
            signature,
          }),
        });

        setLoading(false);
        return;
      } catch (error) {
        console.error('Error redeeming vote:', error);
        revertOptimism();
      }
    }

    // Add vote
    try {
      const keyID = Utils.toHex(Random(8));
      const signature = await signVote(messageTS, direction, keyID);

      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageTS,
          voteType: direction,
          publicKey: userPublicKey,
          signature,
          thread,
          keyID,
        }),
      });
    } catch (error) {
      console.error('Error creating vote token:', error);
      revertOptimism();
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
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {renderSlackStyleEmojis(convertSlackMarkdown(question.text), emojiMap)}
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
          {thread.verified ? (
            <span className="verified">Verified</span>
          ) : (
            <span className="unverified">Unverified</span>
          )}
        </div>
      </div>

      {/* Question Body */}
      <div className="question-section">
        <div className="vote-container">
          <button
            className={`vote-button ${optimisticUserVotes[question.ts]?.upvoted ? 'voted' : ''}`}
            onClick={() => handleVote(question.ts, 'upvotes')}
            disabled={!isConnected}
          >▲</button>
          <span className="vote-count">{optimisticVotes[question.ts] !== undefined ? optimisticVotes[question.ts] : (question.votes?.upvotes?.length || 0) - (question.votes?.downvotes?.length || 0)}</span>
          <button
            className={`vote-button ${optimisticUserVotes[question.ts]?.downvoted ? 'voted' : ''}`}
            onClick={() => handleVote(question.ts, 'downvotes')}
            disabled={!isConnected}
          >▼</button>
        </div>
        <div className="question-content">
          <div className="markdown-content">
            {question && (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {renderSlackStyleEmojis(convertSlackMarkdown(question.text), emojiMap)}
              </ReactMarkdown>
            )}
          </div>
          {question?.userInfo && (
            <div className="user-card">
              {/* Only show tip jar button if paymail is available */}
              {question.paymail && (
                <button
                  onClick={() => handleTipClick(question.ts, question.paymail)}
                  className="tip-jar-button"
                  aria-label="Send tip"
                  disabled={!isConnected}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginRight: 'var(--bsv-spacing-3)',
                    marginTop: '42px',
                    color: 'var(--bsv-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--bsv-spacing-1)',
                    borderRadius: '50%',
                    transition: 'transform var(--bsv-transition-fast), background-color var(--bsv-transition-fast)',
                  }}
                  title="Send a tip"
                >
                  <img
                    src="/tip.svg"
                    width="32"
                    height="32"
                    alt="Tip jar"
                    style={{
                      filter: 'invert(37%) sepia(74%) saturate(1090%) hue-rotate(189deg) brightness(91%) contrast(98%)',
                    }}
                  />
                </button>
              )}
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
          const maxUpvotes = Math.max(...answers.map(a => a.votes.upvotes?.length || 0));
          const isBestAnswer = answer.votes.upvotes?.length === maxUpvotes && maxUpvotes > 0;

          if (!answer.deleted) {
            return (
              <div key={index} className={`answer-section ${isBestAnswer ? 'best-answer' : ''}`}>
                <div className="vote-container">
                  <button
                    className={`vote-button ${optimisticUserVotes[answer.ts]?.upvoted ? 'voted' : ''}`}
                    onClick={() => handleVote(answer.ts, 'upvotes')}
                    disabled={!isConnected}
                  >▲</button>
                  <span className="vote-count">{optimisticVotes[answer.ts] !== undefined ? optimisticVotes[answer.ts] : (answer.votes?.upvotes?.length || 0) - (answer.votes?.downvotes?.length || 0)}</span>
                  <button
                    className={`vote-button ${optimisticUserVotes[answer.ts]?.downvoted ? 'voted' : ''}`}
                    onClick={() => handleVote(answer.ts, 'downvotes')}
                    disabled={!isConnected}
                  >▼</button>
                </div>
                <div className="answer-content">
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {convertSlackMarkdown(renderSlackStyleEmojis(answer.text || 'No content', emojiMap))}
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
                      {/* Only show tip jar button if paymail is available */}
                      {answer.paymail && (
                        <button
                          onClick={() => handleTipClick(question.ts, question.paymail)}
                          className="tip-jar-button"
                          aria-label="Send tip"
                          disabled={!isConnected}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            marginRight: 'var(--bsv-spacing-3)',
                            marginTop: '42px',
                            color: 'var(--bsv-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 'var(--bsv-spacing-1)',
                            borderRadius: '50%',
                            transition: 'transform var(--bsv-transition-fast), background-color var(--bsv-transition-fast)',
                          }}
                          title="Send a tip"
                        >
                          <img
                            src="/tip.svg"
                            width="32"
                            height="32"
                            alt="Tip jar"
                            style={{
                              filter: 'invert(37%) sepia(74%) saturate(1090%) hue-rotate(189deg) brightness(91%) contrast(98%)',
                            }}
                          />
                        </button>
                      )}
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
            )
          };
        })}
      </div>

      <div className="back-link">
        <Link href="/">← Back to all threads</Link>
      </div>

      {/* Modal will be rendered via React Portal to document.body */}
      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          thread={thread}
          messageTS={selectedMessageTS}
          publicKey={userPublicKey}
          paymail={selectedPaymail}
        />
      )}
    </div>
  );
}
