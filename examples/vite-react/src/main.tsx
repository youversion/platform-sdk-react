import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { YouVersionProvider } from '@youversion/platform-react-ui';
import { ThemeProvider, useTheme } from '@/components/theme-provider';
import App from './App';
import './index.css';

function ThemedApp() {
  const theme = useTheme();
  const appKey = import.meta.env.VITE_YVP_APP_KEY ?? '';
  const apiHost = import.meta.env.VITE_YVP_API_HOST ?? 'api.youversion.com';
  const authRedirectUrl = import.meta.env.VITE_YVP_AUTH_REDIRECT_URL ?? window.location.origin;

  return (
    <YouVersionProvider
      theme={theme}
      apiHost={apiHost}
      appKey={appKey}
      includeAuth
      authRedirectUrl={authRedirectUrl}
    >
      <App />
    </YouVersionProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="yv-sdk-demo-theme">
      <ThemedApp />
    </ThemeProvider>
  </StrictMode>,
);
