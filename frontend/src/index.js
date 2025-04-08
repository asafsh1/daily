import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Don't clear stored auth tokens - this was causing authentication issues
// localStorage.removeItem('token');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 