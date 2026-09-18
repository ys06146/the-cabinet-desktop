import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { reportApplicationError } from '../lib/report-error';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportApplicationError(new Error(`${error.message}\n${info.componentStack ?? ''}`));
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-cabinet-background p-5 text-cabinet-text sm:p-8">
          <div className="w-full max-w-2xl">
            <ErrorMessage
              message="Close and reopen the application. A local diagnostic entry has been recorded."
              title="The workspace could not be displayed"
            />
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}