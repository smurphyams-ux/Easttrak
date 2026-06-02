// Global error handler for debugging logout issues
window.addEventListener('error', function(event) {
  console.error('[GLOBAL ERROR]', event.error || event.message, event);
});
window.addEventListener('unhandledrejection', function(event) {
  console.error('[GLOBAL UNHANDLED REJECTION]', event.reason, event);
});
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ProfessionalCustomersProvider } from './contexts/ProfessionalCustomersContext';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}


ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ProfessionalCustomersProvider>
      <App />
    </ProfessionalCustomersProvider>
  </React.StrictMode>
);
