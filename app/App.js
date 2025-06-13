import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router';
import './App.css';
import HomePage from '../components/HomePage';
import ThreadDetail from '../components/ThreadDetail';
import bsvLogo from './assets/bsv-logo.svg';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="navbar-container">
            <Link to="/" className="navbar-brand">
              <img src={bsvLogo} alt="BSV Logo" className="navbar-logo" />
              <span>Slack Threads</span>
            </Link>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/thread/:threadId" element={<ThreadDetail />} />
            <Route path="*" element={<div className="error">Page not found</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
