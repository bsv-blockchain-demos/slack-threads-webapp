// src/components/ThreadList.jsx
'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import '../styles/HomePage.css';

// Move the convertSlackMarkdown function outside of the component so it can be exported
const convertSlackMarkdown = (text) => {
  if (!text) return '';
  let formatted = text.replace(/\*(\S[^*]*)\*/g, '**$1**');
  formatted = formatted.replace(/```([^`]+)```/g, '~~~$1~~~');
  formatted = formatted.replace(/_(\S[^_]*)_/g, '*$1*');
  formatted = formatted.replace(/~(\S[^~]*)~/g, '~~$1~~');
  return formatted;
};

function ThreadList({ initialThreads }) {
  const [threads, setThreads] = useState(initialThreads || []);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('newest');

  useEffect(() => {
    setFilteredThreads(sortThreads(threads, sortType));
  }, [sortType, threads]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredThreads(sortThreads(threads, sortType));
    } else {
      const filtered = threads.filter(t =>
        JSON.stringify(t).toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredThreads(sortThreads(filtered, sortType));
    }
  }, [searchQuery, threads, sortType]);

  const sortThreads = (list, type) => {
    const sorted = [...list];
    if (type === 'newest') {
      return sorted.sort((a, b) => parseFloat(b.messages[0]?.ts) - parseFloat(a.messages[0]?.ts));
    } else if (type === 'active') {
      return sorted.sort((a, b) => new Date(b.last_updated || b.messages[0]?.ts) - new Date(a.last_updated || a.messages[0]?.ts));
    }
    return sorted;
  };

  return (
    <>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <div className="filters">
          <button onClick={() => setSortType('newest')}>Newest</button>
          <button onClick={() => setSortType('active')}>Active</button>
        </div>
      </div>

      <div className="thread-list">
        {filteredThreads.length === 0 ? (
          <p>No threads found</p>
        ) : (
          filteredThreads.map(thread => {
            const question = thread.messages?.[0] || {};
            const answerCount = thread.messages?.length - 1 || 0;
            const voteCount = question.votes?.length || 0;

            return (
              <div key={thread._id} className="thread-summary">
                <div className="thread-stats-col">
                  <div><strong>{voteCount}</strong> votes</div>
                  <div><strong>{answerCount}</strong> answers</div>
                </div>
                <div className="thread-content-col">
                  <Link href={`/threads/${thread._id}`} className="thread-title">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {convertSlackMarkdown(question.text || 'No title')}
                    </ReactMarkdown>
                  </Link>
                  <div className="thread-meta">
                    Asked by {question.userInfo?.real_name || 'Anonymous'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export { ThreadList as default, ThreadList, convertSlackMarkdown };
