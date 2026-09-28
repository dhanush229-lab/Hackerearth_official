import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import IntroSequence from './components/intro/IntroSequence.tsx';
import './index.css';

const INTRO_SEEN_STORAGE_KEY = 'hackerearth_intro_seen';

const hasSeenIntro = () => {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

const markIntroAsSeen = () => {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_STORAGE_KEY, 'true');
  } catch {
    // Keep the intro functional when storage is unavailable.
  }
};

// Check before the first render so a reload in the current browser session never flashes the intro.
const shouldShowIntro = !hasSeenIntro();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shouldShowIntro ? (
      <IntroSequence onComplete={markIntroAsSeen}>
        <App />
      </IntroSequence>
    ) : (
      <App />
    )}
  </StrictMode>
);
