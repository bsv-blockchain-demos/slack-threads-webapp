// src/components/ThreadList.jsx
'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { wrapSlackMentions, Mention } from './renderMentions';
import { renderSlackStyleEmojis } from './renderEmojis';
import { useEmojiMap } from '../context/EmojiContext';
import { useThreadVerification } from '../context/threadVerifiedContext';
import rehypeRaw from 'rehype-raw';

// Move the convertSlackMarkdown function outside of the component so it can be exported
const convertSlackMarkdown = (text) => {
  if (!text) return '';
  let formatted = text.replace(/\*(\S[^*]*)\*/g, '**$1**');
  formatted = formatted.replace(/```([\s\S]*?)```/g, (match, p1) => {
    return `\n\`\`\`\n${p1.trim()}\n\`\`\`\n`;
  });
  formatted = formatted.replace(/_(\S[^_]*)_/g, '*$1*');
  formatted = formatted.replace(/~(\S[^~]*)~/g, '~~$1~~');
  return formatted;
};

function ThreadList({ initialThreads, initialSearch, initialPage, initialLimit, total }) {
  const [threads, setThreads] = useState(initialThreads);
  const [filteredThreads, setFilteredThreads] = useState(initialThreads);
  const [sortType, setSortType] = useState('newest');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const threadsPerPage = initialLimit;
  const totalPages = Math.ceil(total / threadsPerPage);

  const router = useRouter();
  const { emojiMap } = useEmojiMap();
  const { verifiedMap, setVerified } = useThreadVerification();
  const verifyUrl = `${process.env.NEXT_PUBLIC_HOST}/api/verify`;

  useEffect(() => {
    async function verifyThreads(threads) {
      try {
        if (!threads || threads.length === 0) return;

        const threadsToVerify = threads.filter(
          (thread) => !(thread._id in verifiedMap)
        );

        if (threadsToVerify.length === 0) return;

        const res = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threads: threadsToVerify }),
        });

        if (!res.ok) throw new Error('Failed to verify threads');

        const data = await res.json();

        if (data?.results) {
          for (const { threadId, success } of data.results) {
            setVerified(threadId, success || false);
          }
        }
      } catch (error) {
        console.error('Thread verification error:', error);
      }
    }

    verifyThreads(threads);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Sync state when props change
  useEffect(() => {
    setThreads(initialThreads);
    setFilteredThreads(sortThreads(initialThreads, sortType));
  }, [initialThreads, sortType]);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    router.push(`/?search=${searchQuery}&page=1`);
  };

  useEffect(() => {
    setFilteredThreads(sortThreads(threads, sortType));
  }, [sortType, threads]);

  useEffect(() => {
    async function convertUserMentions() {
      await Promise.all(
        threads.map(async (thread) => {
          const allUsersInThread = thread.messages.map((msg) => msg.userInfo);

          for (const message of thread.messages) {
            if (!message.text) continue;

            const mentionRegex = /<@([A-Z0-9]+)>/g;
            const mentionedUserIds = [...message.text.matchAll(mentionRegex)].map(m => m[1]);

            if (mentionedUserIds.length === 0) continue;

            const userIdToNameMap = {};

            for (const userId of mentionedUserIds) {
              if (userIdToNameMap[userId]) continue; // skip if already mapped

              const matchedUser = allUsersInThread.find(u => u.id === userId);
              userIdToNameMap[userId] = matchedUser?.username || matchedUser?.real_name || 'UnknownUser';
            }

            // Replace mentions in text
            message.text = message.text.replace(mentionRegex, (_, userId) => {
              return `<@${userIdToNameMap[userId]}>`;
            });
          }
        })
      );
    }

    convertUserMentions();
  }, [threads]);

  const sortThreads = (list, type) => {
    const sorted = [...list];
    if (type === 'newest') {
      return sorted.sort((a, b) => parseFloat(b.saved_at) - parseFloat(a.saved_at));
    } else if (type === 'active') {
      return sorted.sort((a, b) => new Date(b.last_updated || b.messages[0]?.ts) - new Date(a.last_updated || a.messages[0]?.ts));
    }
    return sorted;
  };

  const paginate = (page) => {
    router.push(`/?search=${searchQuery}&page=${page}`);
  };

  return (
    <div className="thread-detail-container">
      <div className="search-container">
        <form onSubmit={handleSearch} className="form">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </form>
      </div>

      <div className="thread-stats">
        <div className="filters">
          <button
            className={`filter-button ${sortType === 'newest' ? 'active' : ''}`}
            onClick={() => setSortType('newest')}
          >
            Newest
          </button>
          <button
            className={`filter-button ${sortType === 'active' ? 'active' : ''}`}
            onClick={() => setSortType('active')}
          >
            Active
          </button>
        </div>
      </div>

      <div className="thread-list">
        {(filteredThreads.length === 0) ? (
          <p>No threads found</p>
        ) : (
          filteredThreads.map(thread => {
            const question = thread.messages?.[0] || {};
            const answerCount = thread.messages?.length - 1 || 0;
            const voteCount = (question.votes?.upvotes?.length - question.votes?.downvotes?.length) || 0;

            return (
              <div key={thread._id} className="thread-summary">
                <div className="vote-container">
                  <span className="vote-count">{voteCount}</span>
                  <span className="stat-label">votes</span>
                  <div className="stat-divider"></div>
                  <span className="vote-count">{answerCount}</span>
                  <span className="stat-label">answers</span>
                </div>
                <div className="thread-content-col">
                  <Link href={`/threads/${thread._id}`} className="thread-title">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
                      mention: Mention,
                    }}>
                      {wrapSlackMentions(convertSlackMarkdown(renderSlackStyleEmojis(question.text || 'No title'), emojiMap))}
                    </ReactMarkdown>
                  </Link>
                  <div className="thread-meta">
                    {verifiedMap[thread._id] ? (
                      <span className="verified">Verified</span>
                    ) : (
                      <span className="unverified">Unverified</span>
                    )}
                    <span className="asked-by">Asked by {question.userInfo?.username || question.userInfo?.real_name || 'Anonymous'}</span>
                    {thread.saved_at && (
                      <span className="timestamp">{new Date(thread.saved_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Controls */}
        {filteredThreads.length > 0 && (
          <div className="pagination">
            <div className="pagination-arrow-container">
              <button className="pagination-arrow" onClick={() => paginate(1)} aria-label="Go to first page" disabled={currentPage === 1}>«</button>
            </div>
            <div className="pagination-numbers">
              {Array.from({ length: 3 }, (_, i) => {
                // Calculate start page based on currentPage
                let startPage = Math.max(1, currentPage - 1);
                if (currentPage === totalPages) {
                  startPage = Math.max(1, totalPages - 2);
                } else if (currentPage === 1) {
                  startPage = 1;
                }

                const page = startPage + i;
                if (page > totalPages) return null;

                return (
                  <button
                    key={page}
                    onClick={() => paginate(page)}
                    disabled={page === currentPage}
                    className={`pagination-number ${page === currentPage ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <div className="pagination-arrow-container">
              <button className="pagination-arrow" onClick={() => paginate(totalPages)} aria-label="Go to last page" disabled={currentPage === totalPages}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { ThreadList as default, ThreadList, convertSlackMarkdown };