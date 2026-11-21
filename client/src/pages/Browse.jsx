import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../api/client.js';
import ItemCard from '../components/ItemCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { CardSkeletonGrid } from '../components/Loader.jsx';

const CATEGORIES = ['Electronics', 'Books', 'ID Card', 'Wallet', 'Keys', 'Clothing', 'Accessories', 'Sports', 'Other'];
const STATUSES = ['open', 'under-review', 'matched', 'recovered', 'closed'];

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: params.get('q') || '',
    type: params.get('type') || '',
    category: params.get('category') || '',
    location: params.get('location') || '',
    status: params.get('status') || '',
    dateFrom: params.get('dateFrom') || '',
    dateTo: params.get('dateTo') || '',
    sort: params.get('sort') || 'newest',
  });
  const [page, setPage] = useState(1);

  // The navbar links (?type=lost / ?type=found) change the URL only, so the
  // form state has to follow the URL, not just seed from it once.
  useEffect(() => {
    const next = {
      q: params.get('q') || '',
      type: params.get('type') || '',
      category: params.get('category') || '',
      location: params.get('location') || '',
      status: params.get('status') || '',
      dateFrom: params.get('dateFrom') || '',
      dateTo: params.get('dateTo') || '',
      sort: params.get('sort') || 'newest',
    };
    // only re-render when the URL really differs, so mounting does not refetch
    setFilters((current) =>
      Object.keys(next).every((key) => current[key] === next[key]) ? current : next
    );
    setPage(Number(params.get('page')) || 1);
  }, [params]);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = useMemo(() => ({ ...filters, page, limit: 9 }), [filters, page]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get('/items', { params: query })
      .then((res) => {
        if (!alive) return;
        setData({ items: res.data.items, total: res.data.total, pages: res.data.pages });
        setError('');
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query]);

  const apply = (event) => {
    event.preventDefault();
    setPage(1);
    const next = {};
    Object.entries(filters).forEach(([key, value]) => { if (value) next[key] = value; });
    setParams(next);
    // re-trigger the fetch with the same object identity
    setFilters({ ...filters });
  };

  // keep the page number in the URL so a refresh or a shared link keeps it
  const goToPage = (nextPage) => {
    setPage(nextPage);
    const next = {};
    Object.entries(filters).forEach(([key, value]) => { if (value) next[key] = value; });
    if (nextPage > 1) next.page = String(nextPage);
    setParams(next);
  };

  const reset = () => {
    setFilters({ q: '', type: '', category: '', location: '', status: '', dateFrom: '', dateTo: '', sort: 'newest' });
    setParams({});
    setPage(1);
  };

  const change = (key) => (event) => setFilters({ ...filters, [key]: event.target.value });

  return (
    <div className="container section">
      <span className="eyebrow">Discovery</span>
      <h1 className="h2">Browse every report on campus</h1>
      <p className="lead mb-3">Search by keyword and narrow the list by type, category, location, status or date.</p>

      <form className="card card-pad mb-3" onSubmit={apply}>
        <div className="filters">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="q">Search</label>
            <input id="q" className="input" placeholder="e.g. bottle, ID card, charger" value={filters.q} onChange={change('q')} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="type">Type</label>
            <select id="type" className="select" value={filters.type} onChange={change('type')}>
              <option value="">All</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="category">Category</label>
            <select id="category" className="select" value={filters.category} onChange={change('category')}>
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="location">Location</label>
            <input id="location" className="input" placeholder="e.g. Library" value={filters.location} onChange={change('location')} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="status">Status</label>
            <select id="status" className="select" value={filters.status} onChange={change('status')}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn" type="submit"><Search size={15} /> Search</button>
        </div>

        <div className="filters mt-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="dateFrom">Date from</label>
            <input id="dateFrom" type="date" className="input" value={filters.dateFrom} onChange={change('dateFrom')} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="dateTo">Date to</label>
            <input id="dateTo" type="date" className="input" value={filters.dateTo} onChange={change('dateTo')} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="sort">Sort</label>
            <select id="sort" className="select" value={filters.sort} onChange={change('sort')}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>&nbsp;</label>
            <button type="button" className="btn btn-ghost" onClick={reset}>Clear filters</button>
          </div>
        </div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="row-between mb-2">
        <p className="small muted">{loading ? 'Searching…' : `${data.total} report(s) found`}</p>
      </div>

      {loading ? (
        <CardSkeletonGrid count={6} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No reports match your search"
          text="Try a different keyword, or clear the filters to see everything."
          action={<button className="btn btn-ghost btn-sm" onClick={reset}>Clear filters</button>}
        />
      ) : (
        <div className="grid grid-3">
          {data.items.map((item) => <ItemCard key={item._id} item={item} />)}
        </div>
      )}

      {data.pages > 1 && (
        <div className="pager">
          <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Previous</button>
          <span className="small muted">Page {page} of {data.pages}</span>
          <button className="btn btn-sm btn-ghost" disabled={page >= data.pages} onClick={() => goToPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
