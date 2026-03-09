import { YouVersionProvider } from '@youversion/platform-react-ui';
import { useTheme } from '@/components/use-theme';
import App from './App';

export default function ThemedApp() {
  const { theme } = useTheme();
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
