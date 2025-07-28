import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import bsvLogo from '../public/bsv-logo.svg';
import '../src/styles/bsv-theme.css';
import '../src/styles/App.css';
import '../src/styles/HomePage.css';
import '../src/styles/ThreadDetail.css';
import ToasterWrapper from '../src/components/toast';
import { EmojiProvider } from '../src/context/EmojiContext';
import { ThreadVerificationProvider } from '../src/context/threadVerifiedContext';

export const metadata = {
  title: 'Slack Threads',
  description: 'Browse saved Slack threads from the BSVA Slack workspace',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThreadVerificationProvider>
          <EmojiProvider>
            <nav className="navbar">
              <div className="navbar-container">
                <Link href="/" className="navbar-brand">
                  <Image src={bsvLogo} alt="BSV Logo" className="navbar-logo" width={40} height={40} />              <span>Slack Threads</span>
                </Link>
              </div>
            </nav>
            <main className="main-content">
              {children}
              <ToasterWrapper />
            </main>
          </EmojiProvider>
        </ThreadVerificationProvider>
      </body>
    </html>
  );
}
