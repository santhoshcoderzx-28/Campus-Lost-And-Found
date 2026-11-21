import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import Loader from '../components/Loader.jsx';
import StatsRow from '../components/StatsRow.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { showToast } from '../components/Toast.jsx';

const STATUSES = ['open', 'under-review', 'matched', 'recovered', 'closed'];
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({ stats: null, recentActivity: [] });
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [itemPage, setItemPage] = useState(1);
  const [itemPages, setItemPages] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const firstLoad = useRef(true);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dash, u, i, r] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users'),
        api.get('/admin/items', { params: { page: itemPage, limit: 50 } }),
        api.get('/admin/requests'),
      ]);
      setData(dash.data);
      setUsers(u.data.users);
      setItems(i.data.items);
      setItemPages(i.data.pages || 1);
      setRequests(r.data.requests);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // first paint shows the spinner, later page changes refresh the table only
  useEffect(() => {
    load(!firstLoad.current);
    firstLoad.current = false;
  }, [itemPage]);

  const setItemStatus = async (id, status) => {
    if (busyId === id) return;
    setBusyId(id);
    try {
      await api.put(`/admin/items/${id}/status`, { status });
      showToast(`Status changed to ${status}`);
      await load(true);
    } catch (err) { setError(err.message); showToast(err.message, 'error'); } finally { setBusyId(''); }
  };

  const removeItem = async (id) => {
    if (busyId === id) return;
    if (!window.confirm('Remove this report? Its requests and photo are deleted too.')) return;
    setBusyId(id);
    try {
      await api.delete(`/admin/items/${id}`);
      showToast('Report removed');
      await load(true);
    } catch (err) { setError(err.message); showToast(err.message, 'error'); } finally { setBusyId(''); }
  };

  const reviewRequest = async (id, status) => {
    if (busyId === id) return;
    setBusyId(id);
    try {
      await api.put(`/requests/${id}/status`, { status });
      showToast(status === 'approved' ? 'Request approved' : 'Request rejected');
      await load(true);
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setBusyId('');
    }
  };

  const setUserStatus = async (id, accountStatus) => {
    if (busyId === id) return;
    const verb = accountStatus === 'suspended' ? 'Suspend' : 'Reactivate';
    if (!window.confirm(`${verb} this account?`)) return;
    setBusyId(id);
    try {
      await api.put(`/admin/users/${id}/status`, { accountStatus });
      showToast(accountStatus === 'suspended' ? 'Account suspended' : 'Account reactivated');
      await load(true);
    } catch (err) { setError(err.message); showToast(err.message, 'error'); } finally { setBusyId(''); }
  };

  // the API returns the full admin lists, so paging them here keeps the tables readable
  const PER_PAGE = 20;
  const requestPages = Math.max(1, Math.ceil(requests.length / PER_PAGE));
  const safeRequestPage = Math.min(requestPage, requestPages);
  const visibleRequests = requests.slice((safeRequestPage - 1) * PER_PAGE, safeRequestPage * PER_PAGE);
  const userPages = Math.max(1, Math.ceil(users.length / PER_PAGE));
  const safeUserPage = Math.min(userPage, userPages);
  const visibleUsers = users.slice((safeUserPage - 1) * PER_PAGE, safeUserPage * PER_PAGE);

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
              { label: 'Users', value: data.stats.totalUsers ?? '-' },
              { label: 'Lost reports', value: data.stats.totalLost ?? '-' },
              { label: 'Found reports', value: data.stats.totalFound ?? '-' },
              { label: 'Recovered', value: data.stats.recovered ?? '-' },
              { label: 'Pending requests', value: data.stats.pendingRequests ?? '-' },
              { label: 'Total reports', value: data.stats.totalReports ?? '-' },
            ]}
          />

          <h3 className="mt-3 mb-2">Reports by category</h3>
          <div className="card card-pad">
            {(data.stats.byCategory || []).map((c) => (
              <div key={c.category} className="row" style={{ marginBottom: 8 }}>
                <span className="small" style={{ width: 120 }}>{c.category}</span>
                <span style={{ height: 10, borderRadius: 5, background: 'var(--navy-700)', width: `${Math.max(6, (c.count / Math.max(1, ...(data.stats.byCategory || []).map((x) => x.count))) * 60)}%` }} />
                <span className="small muted">{c.count}</span>
              </div>
            ))}
          </div>

          <h3 className="mt-3 mb-2">Recent activity</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Type</th><th>Reported by</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {(data.recentActivity || []).map((item) => (
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

      {tab === 'items' && items.length === 0 && (
        <EmptyState
          title={itemPage > 1 ? 'No reports on this page' : 'No reports yet'}
          text={itemPage > 1 ? 'Go back to the previous page to see the remaining reports.' : 'Nothing has been reported on campus yet.'}
          action={itemPage > 1 ? (
            <button className="btn btn-sm" onClick={() => setItemPage(itemPage - 1)}>Previous page</button>
          ) : null}
        />
      )}

      {tab === 'items' && items.length > 0 && (
        <>
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
                    <select className="select" style={{ width: 'auto' }} value={item.status} disabled={busyId === item._id} onChange={(e) => setItemStatus(item._id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" disabled={busyId === item._id} onClick={() => removeItem(item._id)}>
                      {busyId === item._id ? 'Working…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {itemPages > 1 && (
          <div className="pager">
            <button className="btn btn-sm btn-ghost" disabled={itemPage <= 1} onClick={() => setItemPage(itemPage - 1)}>Previous</button>
            <span className="small muted">Page {itemPage} of {itemPages}</span>
            <button className="btn btn-sm btn-ghost" disabled={itemPage >= itemPages} onClick={() => setItemPage(itemPage + 1)}>Next</button>
          </div>
        )}
        </>
      )}

      {tab === 'requests' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Requester</th><th>Message</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {visibleRequests.map((r) => (
                <tr key={r._id}>
                  <td><Link to={`/items/${r.item._id}`} style={{ fontWeight: 600 }}>{r.item.title}</Link></td>
                  <td className="small">{r.requester.name}<br /><span className="muted">{r.requester.email}</span></td>
                  <td className="small">{r.message}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td className="small">{formatDate(r.createdAt)}</td>
                  <td>
                    {r.status === 'pending' ? (
                      <div className="row">
                        <button className="btn btn-sm" disabled={busyId === r._id} onClick={() => reviewRequest(r._id, 'approved')}>
                          {busyId === r._id ? 'Saving…' : 'Approve'}
                        </button>
                        <button className="btn btn-sm btn-danger" disabled={busyId === r._id} onClick={() => reviewRequest(r._id, 'rejected')}>Reject</button>
                      </div>
                    ) : <span className="muted small">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'requests' && requestPages > 1 && (
        <div className="pager">
          <button className="btn btn-sm btn-ghost" disabled={requestPage <= 1} onClick={() => setRequestPage(requestPage - 1)}>Previous</button>
          <span className="small muted">Page {safeRequestPage} of {requestPages}</span>
          <button className="btn btn-sm btn-ghost" disabled={requestPage >= requestPages} onClick={() => setRequestPage(requestPage + 1)}>Next</button>
        </div>
      )}

      {tab === 'users' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td className="small">{u.email}</td>
                  <td className="small">{u.studentId || '-'}</td>
                  <td><span className="badge badge-open">{u.role}</span></td>
                  <td><span className={`badge badge-${u.accountStatus}`}>{u.accountStatus}</span></td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.accountStatus === 'active' ? 'btn-danger' : ''}`}
                      disabled={busyId === u._id}
                      onClick={() => setUserStatus(u._id, u.accountStatus === 'active' ? 'suspended' : 'active')}
                    >
                      {busyId === u._id ? 'Working…' : (u.accountStatus === 'active' ? 'Suspend' : 'Reactivate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && userPages > 1 && (
        <div className="pager">
          <button className="btn btn-sm btn-ghost" disabled={userPage <= 1} onClick={() => setUserPage(userPage - 1)}>Previous</button>
          <span className="small muted">Page {safeUserPage} of {userPages}</span>
          <button className="btn btn-sm btn-ghost" disabled={userPage >= userPages} onClick={() => setUserPage(userPage + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
