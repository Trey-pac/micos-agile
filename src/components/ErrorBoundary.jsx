import { Component } from 'react';
import { Bomb } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

/**
 * ErrorBoundary — catches unhandled JS errors in the React tree
 * and shows a friendly fallback instead of a white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
          <Card className="max-w-lg w-full shadow-xl p-8 text-center">
            <Bomb className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The app crashed. Here's the error:
            </p>
            <pre className="text-left bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-xs text-red-700 dark:text-red-300 overflow-auto max-h-48 mb-4 whitespace-pre-wrap break-words">
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack && (
                <>
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </>
              )}
            </pre>
            <Button
              onClick={() => {
                // Nuke SW caches before reloading
                if ('caches' in window) {
                  caches.keys().then((names) => {
                    for (const name of names) caches.delete(name);
                  });
                }
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((regs) => {
                    for (const r of regs) r.unregister();
                  });
                }
                sessionStorage.clear();
                window.location.reload();
              }}
              size="lg"
            >
              Clear Cache &amp; Reload
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
