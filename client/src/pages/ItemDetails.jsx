import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Calendar, User, Package } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function ItemDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);

  const isOwner = Boolean(user && item && item.reportedBy && item.reportedBy._id === user._id);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/items/${id}`)
      .then((res) => alive && setItem(res.data.item))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!isOwner) return;
    api.get(`/requests/item/${id}`).then((res) => setRequests(res.data.requests)).catch(() => {});
  }, [id, isOwner]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setFeedback('');
    if (message.trim().length < 15) {
      setFeedback('Please write at least 15 characters explaining why it is yours');
      return;
    }
    setBusy(true);
    try {
      await api.post('/requests', { itemId: id, message });
      setFeedback('Request submitted. The person who reported this item will review it.');
      setMessage('');
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setBusy(false);
    }
  };

  const review = async (requestId, status) => {
    try {
      await api.put(`/requests/${requestId}/status`, { status });
      const res = await api.get(`/requests/item/${id}`);
      setRequests(res.data.requests);
      const refreshed = await api.get(`/items/${id}`);
      setItem(refreshed.data.item);
    } catch (err) {
      setFeedback(err.message);
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className="container section"><div className="alert alert-error">{error}</div></div>;
  if (!item) return null;

  return (
    <div className="container section">
      <p className="mb-2"><Link to="/browse" className="small" style={{ color: 'var(--navy-700)' }}>&larr; Back to browse</Link></p>

      {feedback && <div className={`alert ${feedback.includes('submitted') ? 'alert-success' : 'alert-error'}`}>{feedback}</div>}

      <div className="detail-grid">
        <section className="card card-pad">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="detail-media" />
          ) : (
            <div className="detail-media" style={{ display: 'grid', placeItems: 'center', height: 260, color: '#94a3b8' }}>
              <Package size={34} />
            </div>
          )}

          <div className="row mt-2">
            <span className={`badge badge-${item.type}`}>{item.type}</span>
            <span className={`badge badge-${item.status}`}>{item.status}</span>
            <span className="badge badge-open">{item.category}</span>
          </div>

          <h1 className="h2 mt-1">{item.title}</h1>
          <p>{item.description}</p>

          <dl className="meta-list mt-2">
            <dt><MapPin size={13} /> Location</dt><dd>{item.location}</dd>
            <dt><Calendar size={13} /> Date</dt><dd>{formatDate(item.eventDate)}</dd>
            <dt>Category</dt><dd>{item.category}</dd>
            {item.identifyingFeatures && (<><dt>Features</dt><dd>{item.identifyingFeatures}</dd></>)}
            <dt><User size={13} /> Reported by</dt><dd>{item.reportedBy ? item.reportedBy.name : '-'}</dd>
            <dt>Posted</dt><dd>{formatDate(item.createdAt)}</dd>
          </dl>
        </section>

        <aside className="card card-pad">
          {isOwner ? (
            <>
              <h3>Requests on your report</h3>
              <p className="small muted mb-2">Review each request and approve the right one.</p>
              {requests.length === 0 && <p className="small muted">No requests yet.</p>}
              {requests.map((r) => (
                <div key={r._id} className="card card-pad mb-2">
                  <div className="row-between">
                    <strong>{r.requester.name}</strong>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </div>
                  <p className="small mt-1">{r.message}</p>
                  {r.requester.studentId && <p className="small muted">ID: {r.requester.studentId}</p>}
                  {r.status === 'pending' && (
                    <div className="row mt-1">
                      <button className="btn btn-sm" onClick={() => review(r._id, 'approved')}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => review(r._id, 'rejected')}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : item.type === 'found' ? (
            <>
              <h3>Is this yours?</h3>
              <p className="small muted mb-2">
                Explain why the item belongs to you. Only the person who reported it can see your request.
              </p>
              {user ? (
                <form onSubmit={submitRequest}>
                  <div className="field">
                    <label htmlFor="message">Why is this yours?</label>
                    <textarea id="message" className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} />
                    <span className="hint">At least 15 characters</span>
                  </div>
                  <button className="btn btn-block" type="submit" disabled={busy}>
                    {busy ? 'Submitting…' : 'Request recovery'}
                  </button>
                </form>
              ) : (
                <Link to={`/login?next=${encodeURIComponent(`/items/${item._id}`)}`} className="btn btn-block">
                  Login to request recovery
                </Link>
              )}
            </>
          ) : (
            <>
              <h3>Did you find this?</h3>
              <p className="small muted">
                If you picked up this item, publish a found report so the owner can be matched with you.
              </p>
              <Link to="/report?type=found" className="btn btn-block mt-2">Report a found item</Link>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
