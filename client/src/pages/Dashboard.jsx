import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import EmptyState from '../components/EmptyState.jsx';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [received, setReceived] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [r, rec, my] = await Promise.all([
        api.get('/items/my-reports'),
        api.get('/requests/received'),
        api.get('/requests/my-requests'),
      ]);
      setReports(r.data.items);
      setReceived(rec.data.requests);
      setMine(my.data.requests);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const review = async (id, status) => {
    try {
      await api.put(`/requests/${id}/status`, { status });
      load();
    } catch (err) { setError(err.message); }
  };

  const removeReport = async (id) => {
    if (!window.confirm('Delete this report permanently?')) return;
    try {
      await api.delete(`/items/${id}`);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="container section">
      <div className="row-between mb-2">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1 className="h2">Hello, {user ? user.name.split(' ')[0] : 'student'}</h1>
          <p className="lead small">Manage your reports and the requests connected to them.</p>
        </div>
        <Link to="/report" className="btn btn-accent"><Plus size={16} /> Report new item</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        <button className={`tab${tab === 'reports' ? ' active' : ''}`} onClick={() => setTab('reports')}>
          My reports ({reports.length})
        </button>
        <button className={`tab${tab === 'received' ? ' active' : ''}`} onClick={() => setTab('received')}>
          Requests on my items ({received.length})
        </button>
        <button className={`tab${tab === 'mine' ? ' active' : ''}`} onClick={() => setTab('mine')}>
          My requests ({mine.length})
        </button>
      </div>

      {loading ? <Loader /> : (
        <>
          {tab === 'reports' && (
            reports.length === 0 ? (
              <EmptyState title="No reports yet" text="Report a lost or found item to get started."
                action={<Link to="/report" className="btn btn-sm">Report an item</Link>} />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Item</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {reports.map((item) => (
                      <tr key={item._id}>
                        <td><Link to={`/items/${item._id}`} style={{ fontWeight: 600 }}>{item.title}</Link><br /><span className="muted small">{item.location}</span></td>
                        <td><span className={`badge badge-${item.type}`}>{item.type}</span></td>
                        <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                        <td className="small">{formatDate(item.eventDate)}</td>
                        <td>
                          <div className="row">
                            <Link to={`/items/${item._id}`} className="btn btn-sm btn-ghost">Open</Link>
                            <button className="btn btn-sm btn-danger" onClick={() => removeReport(item._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'received' && (
            received.length === 0 ? (
              <EmptyState title="No requests yet" text="When someone asks for one of your items, it appears here." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Item</th><th>Requester</th><th>Message</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {received.map((r) => (
                      <tr key={r._id}>
                        <td><Link to={`/items/${r.item._id}`} style={{ fontWeight: 600 }}>{r.item.title}</Link></td>
                        <td>{r.requester.name}<br /><span className="muted small">{r.requester.email}</span></td>
                        <td className="small">{r.message}</td>
                        <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                        <td>
                          {r.status === 'pending' ? (
                            <div className="row">
                              <button className="btn btn-sm" onClick={() => review(r._id, 'approved')}>Approve</button>
                              <button className="btn btn-sm btn-danger" onClick={() => review(r._id, 'rejected')}>Reject</button>
                            </div>
                          ) : <span className="muted small">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'mine' && (
            mine.length === 0 ? (
              <EmptyState title="No requests made" text="Open a found item and request recovery to track it here." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Item</th><th>My message</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {mine.map((r) => (
                      <tr key={r._id}>
                        <td><Link to={`/items/${r.item._id}`} style={{ fontWeight: 600 }}>{r.item.title}</Link></td>
                        <td className="small">{r.message}</td>
                        <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                        <td className="small">{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
