import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in both email and password');
      return;
    }
    setBusy(true);
    try {
      const user = await login(email, password);
      const next = params.get('next');
      const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      navigate(safe || (user.role === 'admin' ? '/admin' : '/dashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section">
      <div className="card card-pad form-card">
        <h1 className="h2">Welcome back</h1>
        <p className="lead small mb-3">Log in to report items, request recovery and track your reports.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">University email</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className="btn btn-block" type="submit" disabled={busy}>
            <LogIn size={16} /> {busy ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="small center mt-2">
          New here? <Link to="/register" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Create an account</Link>
        </p>
        <p className="small center muted">
          Use your university email to sign in. Ask the campus lost and found desk if you need an account.
        </p>
      </div>
    </div>
  );
}
