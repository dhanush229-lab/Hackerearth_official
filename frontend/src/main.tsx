import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import IntroSequence from './components/intro/IntroSequence.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IntroSequence>
      <App />
    </IntroSequence>
  </StrictMode>
);
