import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// DOCX-native shell — preserved for rollback but no longer mounted.
// import DocxApp from './DocxApp.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
