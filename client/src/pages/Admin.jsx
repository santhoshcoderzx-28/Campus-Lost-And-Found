import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import Loader from '../components/Loader.jsx';
import StatsRow from '../components/StatsRow.jsx';

const STATUSES = ['open', 'under-review', 'matched', 'recovered', 'closed'];
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({ stats: null, recentActivity: [] });
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [dash, u, i, r] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users'),
        api.get('/admin/items'),
        api.get('/admin/requests'),
      ]);
      setData(dash.data);
      setUsers(u.data.users);
      setItems(i.data.items);
      setRequests(r.data.requests);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setItemStatus = async (id, status) => {
    try { await api.put(`/admin/items/${id}/status`, { status }); load(); } catch (err) { setError(err.message); }
  };

  const removeItem = async (id) => {
    if (!window.confirm('Remove this report?')) return;
    try { await api.delete(`/admin/items/${id}`); load(); } catch (err) { setError(err.message); }
  };

  const setUserStatus = async (id, accountStatus) => {
    try { await api.put(`/admin/users/${id}/status`, { accountStatus }); load(); } catch (err) { setError(err.message); }
  };

  if (loading) return <Loader />;

  return (
    <div className="container section">
      <span className="eyebrow">Administration</span>
      <h1 className="h2">Admin dashboard</h1>
      <p className="lead small mb-3">Statistics, moderation and account management.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        {['overview', 'items', 'requests', 'users'].map((key) => (
          <button key={key} className={`tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && data.stats && (
        <>
          <StatsRow
            items={[
              { label: 'Users', value: data.stats.totalUsers },
              { label: 'Lost reports', value: data.stats.totalLost },
              { label: 'Found reports', value: data.stats.totalFound },
              { label: 'Recovered', value: data.stats.recovered },
              { label: 'Pending requests', value: data.stats.pendingRequests },
              { label: 'Total reports', value: data.stats.totalReports },
            ]}
          />

          <h3 className="mt-3 mb-2">Reports by category</h3>
          <div className="card card-pad">
            {data.stats.byCategory.map((c) => (
              <div key={c.category} className="row" style={{ marginBottom: 8 }}>
                <span className="small" style={{ width: 120 }}>{c.category}</span>
                <span style={{ height: 10, borderRadius: 5, background: 'var(--navy-700)', width: `${Math.max(6, (c.count / Math.max(...data.stats.byCategory.map((x) => x.count))) * 60)}%` }} />
                <span className="small muted">{c.count}</span>
              </div>
            ))}
          </div>

          <h3 className="mt-3 mb-2">Recent activity</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Type</th><th>Reported by</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {data.recentActivity.map((item) => (
                  <tr key={item._id}>
                    <td><Link to={`/items/${item._id}`} style={{ fontWeight: 600 }}>{item.title}</Link></td>
                    <td><span className={`badge badge-${item.type}`}>{item.type}</span></td>
                    <td className="small">{item.reportedBy ? item.reportedBy.name : '-'}</td>
                    <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                    <td className="small">{formatDate(item.eventDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'items' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Type</th><th>Reported by</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td><Link to={`/items/${item._id}`} style={{ fontWeight: 600 }}>{item.title}</Link><br /><span className="muted small">{item.location}</span></td>
                  <td><span className={`badge badge-${item.type}`}>{item.type}</span></td>
                  <td className="small">{item.reportedBy ? item.reportedBy.name : '-'}</td>
                  <td>
                    <select className="select" style={{ width: 'auto' }} value={item.status} onChange={(e) => setItemStatus(item._id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => removeItem(item._id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'requests' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Requester</th><th>Message</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td><Link to={`/items/${r.item._id}`} style={{ fontWeight: 600 }}>{r.item.title}</Link></td>
                  <td className="small">{r.requester.name}<br /><span className="muted">{r.requester.email}</span></td>
                  <td className="small">{r.message}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td className="small">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td className="small">{u.email}</td>
                  <td className="small">{u.studentId || '-'}</td>
                  <td><span className="badge badge-open">{u.role}</span></td>
                  <td><span className={`badge badge-${u.accountStatus}`}>{u.accountStatus}</span></td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.accountStatus === 'active' ? 'btn-danger' : ''}`}
                      onClick={() => setUserStatus(u._id, u.accountStatus === 'active' ? 'suspended' : 'active')}
                    >
                      {u.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
