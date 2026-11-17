import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Root from './App';
import { ThemeProvider } from './theme';
import { AuthProvider } from './store';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);