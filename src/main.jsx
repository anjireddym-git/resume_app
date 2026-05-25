import React from 'react';
import ReactDOM from 'react-dom/client';
// Legacy template/theme-driven shell — preserved for rollback but no longer mounted.
// import App from './App.jsx';
import DocxApp from './DocxApp.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <DocxApp />
    </AuthProvider>
  </React.StrictMode>,
);
