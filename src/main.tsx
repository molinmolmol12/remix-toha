import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle OAuth callback
if (window.location.pathname === '/auth/callback' || window.location.pathname === '/auth/callback/') {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  
  if (accessToken) {
    if (window.opener) {
      window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: accessToken }, '*');
      window.close();
    } else {
      window.location.href = '/';
    }
  } else {
    // Check for error in query string
    const queryParams = new URLSearchParams(window.location.search);
    const error = queryParams.get('error');
    if (error && window.opener) {
      window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error }, '*');
      window.close();
    } else if (window.opener) {
      window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'No access token found' }, '*');
      window.close();
    }
  }
  
  // Render a simple loading/closing message
  createRoot(document.getElementById('root')!).render(
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h2>Memproses login... Jendela ini akan tertutup otomatis.</h2>
    </div>
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
