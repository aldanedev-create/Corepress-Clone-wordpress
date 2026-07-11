// admin/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Service Worker Registration (for PWA)
import { registerSW } from './utils/serviceWorker';

// Performance Monitoring
import { reportWebVitals } from './utils/reportWebVitals';

// Error Tracking (optional)
import * as Sentry from '@sentry/react';

// Initialize Sentry for error tracking (optional)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENV || 'development',
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: ['localhost', /^https:\/\/your-api-domain\.com/],
      }),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Create root and render app
const root = ReactDOM.createRoot(rootElement);

// Render with StrictMode for development
const renderApp = () => {
  if (import.meta.env.DEV) {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    root.render(<App />);
  }
};

renderApp();

// Register Service Worker for PWA support (optional)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerSW();
}

// Report Web Vitals
if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
  reportWebVitals(console.log);
}

// Enable hot reloading in development
if (import.meta.env.DEV && import.meta.hot) {
  import.meta.hot.accept();
}

// Handle application errors (development only)
if (import.meta.env.DEV) {
  // Log any unhandled errors
  window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
  });
}

console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 CorePress CMS Admin Started Successfully           ║
║                                                          ║
║   Environment: ${import.meta.env.VITE_ENV || 'development'.padEnd(44)}║
║   Mode: ${import.meta.env.MODE.padEnd(48)}║
║                                                          ║
║   📦 Version: ${import.meta.env.VITE_APP_VERSION || '1.0.0'.padEnd(36)}║
║   🔗 API: ${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').padEnd(37)}║
║                                                          ║
║   ⚡ Press Ctrl+C to stop the server                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);