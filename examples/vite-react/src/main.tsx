import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/components/theme-provider';
import ThemedApp from './ThemedApp';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="yv-sdk-demo-theme">
      <ThemedApp />
    </ThemeProvider>
  </StrictMode>,
);
