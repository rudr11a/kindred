import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Check local storage theme choice on startup
const startupTheme = localStorage.getItem('kindred-theme');
if (startupTheme === 'light') {
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
  document.body.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
