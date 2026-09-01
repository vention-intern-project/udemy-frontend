import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './shared/ui/tokens/tokens.css';
import { App } from './app';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Application root element is missing');
}

// createRoot is a React 18 API that renders the main App component.
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
