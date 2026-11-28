import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import api from '../api/client.js';
import PasswordInput from '../components/PasswordInput.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section">
      <div className="card card-pad" style={{ maxWidth: 460, margin: '0 auto' }}>
        <h1 className="h3">Set a new password</h1>

        {!token && (
          <div className="alert alert-error" role="alert">
            This link is missing its token. Open the link from your email again, or{' '}
            <Link to="/forgot-password" style={{ fontWeight: 600 }}>request a new one</Link>.
          </div>
        )}
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {token && (
          <form onSubmit={submit} noValidate>
            <PasswordInput
              id="password"
              label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              hint="At least 6 characters"
            />
            <PasswordInput
              id="confirm"
              label="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <button className="btn btn-block" type="submit" disabled={busy}>
              <KeyRound size={16} /> {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}

        <p className="small center mt-2">
          <Link to="/login" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}
