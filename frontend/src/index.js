import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Clear any stored auth tokens
localStorage.removeItem('token');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 