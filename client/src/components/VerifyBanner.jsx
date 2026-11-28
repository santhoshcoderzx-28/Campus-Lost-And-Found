import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { showToast } from './Toast.jsx';
import api from '../api/client.js';

// Soft verification: the account works, but we keep asking until the email is
// confirmed. Nothing is blocked, so a missed email never locks a student out.
export default function VerifyBanner() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user || user.emailVerified !== false) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await api.post('/auth/resend-verification');
      showToast('Verification email sent');
      if (refreshUser) refreshUser();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ marginTop: 14 }}>
      <div className="alert alert-info" role="status">
        <MailCheck size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Please verify <strong>{user.email}</strong> — check your inbox for the link.{' '}
        <button className="btn btn-sm btn-ghost" onClick={resend} disabled={busy}>
          {busy ? 'Sending…' : 'Resend email'}
        </button>
      </div>
    </div>
  );
}
