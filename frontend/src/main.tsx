import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import IntroSequence from './components/intro/IntroSequence.tsx';
import './index.css';

const INTRO_SEEN_STORAGE_KEY = 'hackerearth_intro_seen_v1';

const hasSeenIntro = () => {
  try {
    return window.localStorage.getItem(INTRO_SEEN_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

const markIntroAsSeen = () => {
  try {
    window.localStorage.setItem(INTRO_SEEN_STORAGE_KEY, 'true');
  } catch {
    // Keep the intro functional when storage is unavailable.
  }
};

// Check before the first render so returning visitors never see the intro flash.
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
