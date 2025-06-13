import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './HomePage.css';

// Function to convert Slack-style markdown to standard markdown
export const convertSlackMarkdown = (text) => {
  if (!text) return '';
  
  // Replace Slack's *bold* with **bold** for markdown
  let formattedText = text.replace(/\*(\S[^*]*)\*/g, '**$1**');
  
  // Handle 3 ``` codeblock
  formattedText = formattedText.replace(/```([^`]+)```/g, '~~~$1~~~');

  // Handle code blocks with backticks
  formattedText = formattedText.replace(/`([^`]+)`/g, '`$1`');
  
  // Handle _italic_ properly
  formattedText = formattedText.replace(/_(\S[^_]*)_/g, '*$1*');
  
  // Handle ~strikethrough~ properly
  formattedText = formattedText.replace(/~(\S[^~]*)~/g, '~~$1~~');
  
  return formattedText;
};

function HomePage() {
  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState('newest'); // Default sort type

  // Apply sorting when sort type or threads change
  useEffect(() => {
    if (threads.length > 0) {
      // Only resort when sort type changes or threads are loaded
      setFilteredThreads(sortThreads(threads, sortType));
    }
  }, [sortType, threads]);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        console.log('Fetching threads from API...');
        // Add sort parameter to get newest threads first
        const response = await axios.get('http://localhost:5001/api/threads?sort=newest');
        console.log('API Response:', response.data);
        
        if (!response.data || response.data.length === 0) {
          console.log('No threads returned from API');
          setThreads([]);
          setLoading(false);
          return;
        }

        console.log(response.data);
        
        // Apply the current sort type to the threads
        const sortedThreads = sortThreads(response.data, sortType);
        
        console.log(`Sorted ${sortedThreads.length} threads by ${sortType}`);
        setThreads(response.data); // Keep original data unsorted
        setFilteredThreads(sortedThreads); // Apply sorting to displayed threads
        setLoading(false);
      } catch (err) {
        console.error('Error fetching threads:', err);
        setError(`Failed to fetch threads: ${err.message}`);
        setLoading(false);
      }
    };

    fetchThreads();
    // We only want to run this effect once when the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to sort threads based on sort type
  const sortThreads = (threadsToSort, type) => {
    if (!threadsToSort || threadsToSort.length === 0) return [];
    
    const sorted = [...threadsToSort];
    
    if (type === 'newest') {
      // Sort by timestamp (newest first)
      return sorted.sort((a, b) => {
        // Convert string timestamps to numbers for proper comparison
        const aTime = a.messages && a.messages[0] ? parseFloat(a.messages[0].ts) * 1000 : 0;
        const bTime = b.messages && b.messages[0] ? parseFloat(b.messages[0].ts) * 1000 : 0;
        return bTime - aTime;
      });
    } else if (type === 'active') {
      // Sort by last_updated (most recently active first)
      return sorted.sort((a, b) => {
        // Convert date strings to timestamps for proper comparison
        let aTime, bTime;
        
        if (a.last_updated) {
          // If last_updated is a date string, convert to timestamp
          aTime = new Date(a.last_updated).getTime();
        } else {
          // Fallback to message timestamp
          aTime = a.messages && a.messages[0] ? parseFloat(a.messages[0].ts) * 1000 : 0;
        }
        
        if (b.last_updated) {
          // If last_updated is a date string, convert to timestamp
          bTime = new Date(b.last_updated).getTime();
        } else {
          // Fallback to message timestamp
          bTime = b.messages && b.messages[0] ? parseFloat(b.messages[0].ts) * 1000 : 0;
        }
        
        // Return the comparison result (most recent first)
        return bTime - aTime;
      });
    }
    
    return sorted;
  };
  
  // Handle sort button click
  const handleSortClick = (type) => {
    setSortType(type);
    setFilteredThreads(sortThreads(searchQuery ? filteredThreads : threads, type));
  };
  
  // Function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'unknown date';
    const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} mins ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffMinutes / 1440)} days ago`;
    }
  };

  // No longer needed as we're using server-side search

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce the search to avoid too many API calls
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 800);
  };
  
  // Perform search using the API
  const performSearch = async (query) => {
    try {
      if (!query.trim()) {
        // If search is empty, show all threads sorted by current sort type
        setFilteredThreads(sortThreads(threads, sortType));
        return;
      }
      
      // Show loading state
      setLoading(true);
      
      // Call the search API with the updated endpoint path
      const response = await axios.get(`http://localhost:5001/api/search/threads?q=${encodeURIComponent(query)}`);
      
      console.log(`Found ${response.data.length} threads matching "${query}"`);
      // Apply current sort type to search results
      const sortedResults = sortThreads(response.data, sortType);
      setFilteredThreads(sortedResults);
      setLoading(false);
    } catch (err) {
      console.error('Error searching threads:', err);
      setError('Failed to search threads');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading threads...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="home-page">
      <div className="header">
        <h1>Slack Threads</h1>
        <p>Recent discussions from Slack</p>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
      </div>
      
      <div className="thread-stats">
        <span>{threads.length} questions</span>
        <div className="filters">
          <button 
            className={`filter-button ${sortType === 'newest' ? 'active' : ''}`}
            onClick={() => handleSortClick('newest')}
          >
            Newest
          </button>
          <button 
            className={`filter-button ${sortType === 'active' ? 'active' : ''}`}
            onClick={() => handleSortClick('active')}
          >
            Active
          </button>
        </div>
      </div>
      
      <div className="thread-list">
        {loading ? (
          <p>Loading threads...</p>
        ) : filteredThreads.length === 0 ? (
          searchQuery ? <p>No matching threads found</p> : <p>No threads found</p>
        ) : (
          filteredThreads.map(thread => {
            const question = thread.messages && thread.messages[0] ? thread.messages[0] : {};
            const answerCount = thread.messages ? thread.messages.length - 1 : 0;
            const voteCount = question.votes ? question.votes.length : 0;

            // Thread ID is now properly used for the key
            
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
                  <Link to={`/thread/${thread._id}`} className="thread-title">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{convertSlackMarkdown(question.text || 'No title')}</ReactMarkdown>
                  </Link>
                  <div className="thread-meta">
                    <span className="asked-by">
                      asked {formatDate(question.ts)} by {question.userInfo.real_name || 'Anonymous'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default HomePage;
