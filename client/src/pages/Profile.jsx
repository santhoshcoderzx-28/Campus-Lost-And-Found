import { useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user ? user.name : '', studentId: user ? user.studentId : '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage(''); setError('');
    try {
      const res = await api.put('/auth/profile', profile);
      setUser(res.data.user);
      localStorage.setItem('clf_user', JSON.stringify(res.data.user));
      setMessage('Profile updated');
    } catch (err) { setError(err.message); }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setMessage(''); setError('');
    if (passwords.newPassword !== passwords.confirm) return setError('Passwords do not match');
    if (passwords.newPassword.length < 6) return setError('New password must be at least 6 characters');
    try {
      await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      setMessage('Password updated');
    } catch (err) { setError(err.message); }
  };

  if (!user) return null;

  return (
    <div className="container section">
      <span className="eyebrow">Account</span>
      <h1 className="h2">My profile</h1>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2">
        <section className="card card-pad">
          <h3>Account details</h3>
          <dl className="meta-list mt-2">
            <dt>Email</dt><dd>{user.email}</dd>
            <dt>Role</dt><dd>{user.role}</dd>
            <dt>Status</dt><dd><span className={`badge badge-${user.accountStatus}`}>{user.accountStatus}</span></dd>
          </dl>

          <form className="mt-3" onSubmit={saveProfile}>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="studentId">Student ID</label>
              <input id="studentId" className="input" value={profile.studentId || ''} onChange={(e) => setProfile({ ...profile, studentId: e.target.value })} />
            </div>
            <button className="btn" type="submit">Save changes</button>
          </form>
        </section>

        <section className="card card-pad">
          <h3>Change password</h3>
          <p className="small muted mb-2">Passwords are stored as bcrypt hashes, never as plain text.</p>
          <form onSubmit={savePassword}>
            <div className="field">
              <label htmlFor="currentPassword">Current password</label>
              <input id="currentPassword" type="password" className="input" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="newPassword">New password</label>
              <input id="newPassword" type="password" className="input" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm new password</label>
              <input id="confirm" type="password" className="input" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
            </div>
            <button className="btn" type="submit">Update password</button>
          </form>
        </section>
      </div>
    </div>
  );
}
