import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arc-Reactor Dashboard',
  description: 'Real-time monitoring for Arc-Reactor orchestration engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 px-6 py-4">
          <nav className="mx-auto flex max-w-7xl items-center justify-between">
            <a href="/" className="text-xl font-bold text-blue-400">
              Arc-Reactor Dashboard
            </a>
            <div className="flex items-center gap-6">
              <a href="/" className="text-gray-300 hover:text-white">Runs</a>
              <a href="/live" className="text-gray-300 hover:text-white">Live</a>
              <a href="/analytics" className="text-gray-300 hover:text-white">Analytics</a>
              <a href="/phases" className="text-gray-300 hover:text-white">Phases</a>
              <a href="/vibranium" className="text-gray-300 hover:text-white">Vibranium</a>
              <a href="/compare" className="text-gray-300 hover:text-white">Compare</a>
              <a href="/settings" className="text-gray-300 hover:text-white">Settings</a>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
