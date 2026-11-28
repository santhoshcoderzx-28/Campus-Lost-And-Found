import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import Loader from '../components/Loader.jsx';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('failed');
      setMessage('This link is missing its token. Open the link from your email again.');
      return;
    }
    let alive = true;
    api
      .post('/auth/verify-email', { token })
      .then((res) => {
        if (!alive) return;
        setState('done');
        setMessage(res.data.message || 'Email verified.');
      })
      .catch((err) => {
        if (!alive) return;
        setState('failed');
        setMessage(err.message);
      });
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="container section">
      <div className="card card-pad" style={{ maxWidth: 460, margin: '0 auto' }}>
        <h1 className="h3">Email verification</h1>
        {state === 'working' && <Loader label="Checking your link…" />}
        {state === 'done' && (
          <>
            <div className="alert alert-success" role="status">{message}</div>
            <Link to="/login" className="btn btn-block">Continue to login</Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <div className="alert alert-error" role="alert">{message}</div>
            <p className="small muted">
              Sign in and use <strong>Resend verification email</strong> on your dashboard to get a new link.
            </p>
            <Link to="/login" className="btn btn-block">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}
