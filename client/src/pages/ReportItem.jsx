import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, AlertTriangle } from 'lucide-react';
import api from '../api/client.js';

const CATEGORIES = ['Electronics', 'Books', 'ID Card', 'Wallet', 'Keys', 'Clothing', 'Accessories', 'Sports', 'Other'];

export default function ReportItem() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: params.get('type') === 'found' ? 'found' : 'lost',
    title: '',
    category: '',
    description: '',
    location: '',
    eventDate: new Date().toISOString().slice(0, 10),
    identifyingFeatures: '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState(null);
  const boxRef = useRef(null);

  const change = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const onFile = (event) => {
    const picked = event.target.files[0];
    if (!picked) return;
    if (!/image\/(jpeg|jpg|png|webp)/.test(picked.type)) {
      setError('Only JPG, PNG and WebP images are allowed');
      return;
    }
    if (picked.size > 3 * 1024 * 1024) {
      setError('Image must be smaller than 3 MB');
      return;
    }
    setError('');
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.title.trim().length < 3) return setError('Item name must be at least 3 characters');
    if (!form.category) return setError('Please choose a category');
    if (form.description.trim().length < 10) return setError('Description must be at least 10 characters');
    if (!form.location.trim()) return setError('Location is required');
    if (!form.eventDate) return setError('Date is required');

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (file) data.append('image', file);

    setBusy(true);
    try {
      const res = await api.post('/items', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      const found = res.data.possibleMatches || [];
      if (found.length) {
        setMatches({ item: res.data.item, list: found });
        setTimeout(() => boxRef.current && boxRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
        setBusy(false);
        return;
      }
      navigate(`/items/${res.data.item._id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (matches) {
    return (
      <div className="container section" ref={boxRef}>
        <div className="alert alert-success">Report saved.</div>
        <div className="alert alert-info">
          <strong>Possible match found.</strong> Someone has already reported something similar.
          Check these before assuming your item is still missing.
          <ul style={{ margin: '10px 0 0 18px' }}>
            {matches.list.map((m) => (
              <li key={m._id}>
                <Link to={`/items/${m._id}`} style={{ fontWeight: 600 }}>{m.title}</Link>
                {' '}- {m.type} at {m.location}
              </li>
            ))}
          </ul>
        </div>
        <div className="row mt-2">
          <Link to={`/items/${matches.item._id}`} className="btn">Open my report</Link>
          <Link to="/dashboard" className="btn btn-ghost">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <span className="eyebrow">New report</span>
      <h1 className="h2">Report a {form.type} item</h1>
      <p className="lead mb-3">Give as much detail as you can - it is what helps the item find its owner.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card card-pad" onSubmit={submit} noValidate>
        <div className="form-row">
          <div className="field">
            <label htmlFor="type">I am reporting</label>
            <select id="type" className="select" value={form.type} onChange={change('type')}>
              <option value="lost">A lost item (I lost it)</option>
              <option value="found">A found item (I found it)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" className="select" value={form.category} onChange={change('category')}>
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="title">Item name</label>
          <input id="title" className="input" placeholder="e.g. Blue Milton water bottle" value={form.title} onChange={change('title')} />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" className="textarea" placeholder="Colour, brand, marks, what was inside…" value={form.description} onChange={change('description')} />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" className="input" placeholder="e.g. Library 2nd floor, Canteen" value={form.location} onChange={change('location')} />
          </div>
          <div className="field">
            <label htmlFor="eventDate">Date {form.type === 'lost' ? 'lost' : 'found'}</label>
            <input id="eventDate" type="date" className="input" value={form.eventDate} onChange={change('eventDate')} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="identifyingFeatures">Identifying features <span className="hint">(optional)</span></label>
          <input id="identifyingFeatures" className="input" placeholder="Something only the owner would know" value={form.identifyingFeatures} onChange={change('identifyingFeatures')} />
        </div>

        <div className="field">
          <label htmlFor="image">Photo <span className="hint">(optional, JPG/PNG/WebP, max 3 MB)</span></label>
          <input id="image" type="file" className="input" accept="image/jpeg,image/png,image/webp" onChange={onFile} />
          {preview && (
            <img src={preview} alt="Preview" style={{ marginTop: 10, maxHeight: 220, borderRadius: 10, border: '1px solid var(--line)' }} />
          )}
        </div>

        <button className="btn btn-block" type="submit" disabled={busy}>
          <Upload size={16} /> {busy ? 'Submitting…' : 'Submit report'}
        </button>

        <p className="small muted mt-2">
          <AlertTriangle size={13} style={{ verticalAlign: '-2px' }} /> Do not include details that would let
          someone falsely claim the item.
        </p>
      </form>
    </div>
  );
}
