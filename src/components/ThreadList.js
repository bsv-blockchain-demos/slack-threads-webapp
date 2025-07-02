// src/components/ThreadList.jsx
'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

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
  const [currentPage, setCurrentPage] = useState(1);
  const threadsPerPage = 10;

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

  // Calculate pagination
  const indexOfLastThread = currentPage * threadsPerPage;
  const indexOfFirstThread = indexOfLastThread - threadsPerPage;
  const currentThreads = filteredThreads.slice(indexOfFirstThread, indexOfLastThread);
  const totalPages = Math.ceil(filteredThreads.length / threadsPerPage);

  // Handle page changes
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    console.log('Page changed to:', pageNumber);
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
        {filteredThreads.length === 0 ? (
          <p>No threads found</p>
        ) : (
          currentThreads.map(thread => {
            const question = thread.messages?.[0] || {};
            const answerCount = thread.messages?.length - 1 || 0;
            const voteCount = (question.votes?.upvotes?.length - question.votes?.downvotes?.length) || 0;

            return (
              <div key={thread._id} className="thread-summary">
                <div className="thread-stats-col">
                  <div className="stat-item">
                    <span className="stat-number">{voteCount}</span>
                    <span className="stat-label">votes</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{answerCount}</span>
                    <span className="stat-label">answers</span>
                  </div>
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

        {/* Pagination Controls */}
        {filteredThreads.length > 0 && (
          <div className="pagination">
            <div className="pagination-arrow-container">
              <button className="pagination-arrow" onClick={() => paginate(1)} aria-label="Go to first page" disabled={currentPage === 1}>«</button>
            </div>
            <div className="pagination-numbers">
              {(() => {
                // Show 3 pages at a time
                // If on page 1, show pages 1-3
                // If on page 2, show pages 1-2-3 where 2 highlighted, etc.
                let startPage, endPage;

                if (totalPages <= 3) {
                  // Fewer than 3 pages total, show them all
                  startPage = 1;
                  endPage = totalPages;
                } else if (currentPage === 1) {
                  startPage = 1;
                  endPage = 3;
                } else if (currentPage === totalPages) {
                  startPage = totalPages - 2;
                  endPage = totalPages;
                } else {
                  startPage = currentPage - 1;
                  endPage = currentPage + 1;
                }

                // Generate array of page numbers to display
                const pageNumbers = [];
                for (let i = startPage; i <= endPage; i++) {
                  pageNumbers.push(i);
                }

                return pageNumbers.map(number => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    disabled={currentPage === number}
                    className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                  >
                    {number}
                  </button>
                ));
              })()}
            </div>
            <div className="pagination-arrow-container">
              <button className="pagination-arrow" onClick={() => paginate(totalPages)} aria-label="Go to last page" disabled={currentPage === totalPages}>»</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export { ThreadList as default, ThreadList, convertSlackMarkdown };