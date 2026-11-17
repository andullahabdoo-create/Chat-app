import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeCtx {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {} });

function initialDark(): boolean {
  const saved = localStorage.getItem('messaging_theme');
  if (saved) return saved === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState<boolean>(initialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggle = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem('messaging_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
