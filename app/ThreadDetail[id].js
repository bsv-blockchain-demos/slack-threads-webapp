import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ThreadDetail.css';
import { SlackImage } from './slackImage';
import { convertSlackMarkdown } from './HomePage';

function ThreadDetail() {
  // Manual extraction of threadId from URL since useParams isn't working
  const getThreadIdFromUrl = () => {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  };

  const threadId = getThreadIdFromUrl();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchThread = async () => {
      try {
        console.log(`Fetching thread with ID: ${threadId}`);
        console.log(`Thread ID type: ${typeof threadId}`);

        if (!threadId) {
          throw new Error('Thread ID is undefined or empty');
        }

        // Fall back to the regular thread endpoint
        console.log(`Falling back to regular endpoint: http://localhost:5001/api/threads/${threadId}`);
        const response = await axios.get(`http://localhost:5001/api/threads/${threadId}`);

        if (!response.data) {
          throw new Error('No thread data returned from API');
        }

        console.log('Thread API Response:', response.data);
        console.log('Thread messages:', response.data.messages ? response.data.messages.length : 'none');

        setThread(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching thread:', err);
        console.error('Error details:', err.response ? err.response.data : 'No response data');
        console.error('Error status:', err.response ? err.response.status : 'No status code');

        const errorMessage = err.response ?
          `Failed to fetch thread details: ${err.response.status} ${err.response.statusText}` :
          `Failed to fetch thread details: ${err.message}`;

        setError(errorMessage);
        setLoading(false);
      }
    };

    if (threadId) {
      fetchThread();
    } else {
      setError('No thread ID provided in URL');
      setLoading(false);
    }
  }, [threadId]);

  // Get the first message as the question
  const question = thread?.messages && thread.messages.length > 0 ? thread.messages[0] : null;
  // Get the rest of the messages as answers
  const answers = thread?.messages && thread.messages.length > 1 ? thread.messages.slice(1) : [];

  if (loading) {
    return <div className="loading">Loading thread...</div>;
  }

  if (error) {
    return (
      <div className="thread-detail">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <p>Thread ID: {threadId || 'Not available'}</p>
          <div className="troubleshooting">
            <h3>Troubleshooting:</h3>
            <ul>
              <li>Check that the thread ID in the URL is correct</li>
              <li>Verify that the server is running on port 5001</li>
              <li>Make sure the thread exists in the database</li>
            </ul>
          </div>
          <div className="back-link">
            <Link to="/">← Back to all threads</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!thread) {
    return <div className="error">Thread not found</div>;
  }

  console.log('answers:', answers)

  return (
    <div className="thread-detail-container">
      <div className="thread-header">
        <h1>{question ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{convertSlackMarkdown(question.text)}</ReactMarkdown> : 'No question'}</h1>
        <div className="thread-metadata">
          <span>asked {thread.saved_at ? new Date(thread.saved_at).toLocaleString() : 'unknown date'}</span>
          <span>by {thread.saved_by_info.real_name || 'Anonymous'}</span>
        </div>
      </div>

      <div className="question-section">
        <div className="vote-container">
          <button className="vote-button">▲</button>
          <span className="vote-count">{question && question.votes ? question.votes.length : 0}</span>
          <button className="vote-button">▼</button>
        </div>
        <div className="question-content">
          <div className="markdown-content">
            {question ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{convertSlackMarkdown(question.text)}</ReactMarkdown> : 'No question content'}
          </div>
          {question && question.userInfo && (
            <div className="user-card">
              <div className="user-info">
                <div className="user-avatar">
                  {question.userInfo.real_name ? question.userInfo.real_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="user-name">{question.userInfo.real_name || 'Anonymous'}</div>
                  <div className="user-timestamp">
                    asked {thread.saved_at ? new Date(thread.saved_at).toLocaleString() : 'unknown date'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="answers-section">
        <div className="answers-header">
          <h2>Answers <span className="answers-count">{answers.length}</span></h2>
        </div>

        {answers.map((answer, index) => {
          // Determine if this is the best answer (most reactions)
          const reactionCounts = answers.map(a => a.reactions ? a.reactions.length : 0);
          const maxReactions = Math.max(...reactionCounts);
          const isBestAnswer = answer.reactions && answer.reactions.length === maxReactions && maxReactions > 0;
          const files = answer?.raw?.files || [];

          return (
            <div
              key={index}
              className={`answer-section ${isBestAnswer ? 'best-answer' : ''}`}
            >
              <div className="vote-container">
                <button className="vote-button">▲</button>
                <span className="vote-count">{answer.votes ? answer.votes.length : 0}</span>
                <button className="vote-button">▼</button>
              </div>
              <div className="answer-content">
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{convertSlackMarkdown(answer.text || 'No content')}</ReactMarkdown>
                </div>
                {files.length > 0 && (
                  <div className="answer-files">
                    {files.map((file, fileIndex) => (
                      <div key={`file_${answer.ts}_${fileIndex}`} className="answer-file">
                        {file.url_private ? (
                          <div className="answer-file-image">
                            <SlackImage
                              file={file}/>
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
                        {answer.userInfo.real_name ? answer.userInfo.real_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="user-name">{answer.userInfo.real_name || 'Anonymous'}</div>
                        <div className="user-timestamp">
                          answered {answer.ts ? new Date(answer.ts * 1000).toLocaleString() : 'unknown time'}
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
        <Link to="/">← Back to all threads</Link>
      </div>
    </div>
  );
}

export default ThreadDetail;
