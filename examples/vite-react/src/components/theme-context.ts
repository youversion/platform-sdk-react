import { createContext } from 'react';

type ThemeProviderState = {
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
};

export const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);
