import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { YouVersionProvider } from '@youversion/platform-react-ui';
import { ThemeProvider } from '@/components/theme-provider';
import App from './App';
import './index.css';

const appKey = import.meta.env.VITE_YVP_APP_KEY ?? '';
const apiHost = import.meta.env.VITE_YVP_API_HOST ?? 'api.youversion.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="yv-sdk-demo-theme">
      <YouVersionProvider
        apiHost={apiHost}
        appKey={appKey}
        includeAuth
        authRedirectUrl="http://localhost:5173"
      >
        <App />
      </YouVersionProvider>
    </ThemeProvider>
  </StrictMode>,
);
