import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { reportApplicationError } from './lib/report-error';
import './styles/index.css';

window.addEventListener('error', (event) => reportApplicationError(event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => reportApplicationError(event.reason));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Renderer root element was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
