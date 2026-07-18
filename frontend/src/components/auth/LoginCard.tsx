import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Loader2 } from 'lucide-react';

export function LoginCard() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !password) { setError('both fields are required'); return; }
    try {
      setLoading(true);
      setError('');
      await login(userId, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button className="login-theme-btn" onClick={toggle} title="Toggle theme">
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <div className="login-card">
        <div className="login-card-header">
          <h1 className="login-title">Rustyn Affiliate</h1>
          <p className="login-subtitle">Sign in to your affiliate account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <div className="form-group">
            <label className="form-label">User ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. john_doe"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Loader2 size={15} className="spin" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
