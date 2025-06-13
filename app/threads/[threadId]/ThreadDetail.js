'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SlackImage } from '../../../src/components/slackImage';
import { convertSlackMarkdown } from '../../../src/components/ThreadList';
import Link from 'next/link';

export default function ThreadDetail({ thread }) {
  const question = thread?.messages?.[0] || null;
  const answers = thread?.messages?.slice(1) || [];

  if (!thread) return <div className="error">Thread not found</div>;

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
          <button className="vote-button">▲</button>
          <span className="vote-count">{question?.votes?.length || 0}</span>
          <button className="vote-button">▼</button>
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
                <button className="vote-button">▲</button>
                <span className="vote-count">{answer.votes?.length || 0}</span>
                <button className="vote-button">▼</button>
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
