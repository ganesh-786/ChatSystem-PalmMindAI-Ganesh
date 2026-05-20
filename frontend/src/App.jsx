import { useEffect, useState } from 'react';
import api, { setAuthToken } from './services/api.js';
import AuthPanel from './components/AuthPanel.jsx';
import ChatApp from './components/ChatApp.jsx';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    async function restoreSession() {
      if (token) {
        setAuthToken(token);
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.user);
          setStatus('signedIn');
          return;
        } catch (error) {
          console.warn('Access token expired or invalid.', error);
        }
      }

      try {
        const refreshResponse = await api.post('/auth/refresh');
        const { token: newToken, user: refreshedUser } = refreshResponse.data;
        setAuthToken(newToken);
        setUser(refreshedUser);
        setStatus('signedIn');
      } catch (error) {
        setStatus('signedOut');
      }
    }

    restoreSession();
  }, []);

  const handleLogin = ({ user: loggedUser, token }) => {
    setAuthToken(token);
    setUser(loggedUser);
    setStatus('signedIn');
  };

  const handleLogout = () => {
    setUser(null);
    setStatus('signedOut');
    setAuthToken(null);
  };

  return (
    <div className="app-shell">
      {status === 'loading' ? (
        <div className="loading-state">Loading session...</div>
      ) : user ? (
        <ChatApp user={user} onLogout={handleLogout} />
      ) : (
        <AuthPanel onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
