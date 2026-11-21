import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput.jsx';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', studentId: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const change = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.name.trim().length < 2) return setError('Please enter your full name');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Please enter a valid email address');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.password !== form.confirm) return setError('Passwords do not match');

    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        studentId: form.studentId.trim(),
        password: form.password,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section">
      <div className="card card-pad form-card">
        <h1 className="h2">Create your account</h1>
        <p className="lead small mb-3">Use your university email so the finder can identify you.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" className="input" value={form.name} onChange={change('name')} />
          </div>
          <div className="field">
            <label htmlFor="email">University email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={change('email')} />
          </div>
          <div className="field">
            <label htmlFor="studentId">Student ID <span className="hint">(optional)</span></label>
            <input id="studentId" className="input" value={form.studentId} onChange={change('studentId')} />
          </div>
          <div className="form-row">
            <PasswordInput
              id="password"
              label="Password"
              value={form.password}
              onChange={change('password')}
              hint="At least 6 characters"
              autoComplete="new-password"
            />
            <PasswordInput
              id="confirm"
              label="Confirm password"
              value={form.confirm}
              onChange={change('confirm')}
              autoComplete="new-password"
            />
          </div>
          <button className="btn btn-block" type="submit" disabled={busy}>
            <UserPlus size={16} /> {busy ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="small center mt-2">
          Already registered? <Link to="/login" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
