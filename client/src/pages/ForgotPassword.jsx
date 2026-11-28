import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import api from '../api/client.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address');
    setBusy(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSent(res.data.message || 'If that email has an account, a reset link is on its way.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section">
      <div className="card card-pad" style={{ maxWidth: 460, margin: '0 auto' }}>
        <h1 className="h3">Forgot your password?</h1>
        <p className="small muted mb-2">
          Enter the email you signed up with and we will send a link to set a new password.
          The link works once and expires in one hour.
        </p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {sent && <div className="alert alert-success" role="status">{sent}</div>}

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">University email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <button className="btn btn-block" type="submit" disabled={busy}>
            <Mail size={16} /> {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="small center mt-2">
          <Link to="/login" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}
