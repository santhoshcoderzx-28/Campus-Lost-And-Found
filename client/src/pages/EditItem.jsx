import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client.js';
import Loader from '../components/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORIES = ['Electronics', 'Books', 'ID Card', 'Wallet', 'Keys', 'Clothing', 'Accessories', 'Sports', 'Other'];
const STATUSES = ['open', 'under-review', 'matched', 'recovered', 'closed'];

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [currentImage, setCurrentImage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/items/${id}`)
      .then((res) => {
        const item = res.data.item;
        const isOwner = item.reportedBy && user && item.reportedBy._id === user._id;
        if (!isOwner && (!user || user.role !== 'admin')) {
          navigate(`/items/${id}`, { replace: true });
          return;
        }
        setCurrentImage(item.imageUrl || '');
        setForm({
          title: item.title,
          description: item.description,
          category: item.category,
          type: item.type,
          location: item.location,
          eventDate: String(item.eventDate).slice(0, 10),
          identifyingFeatures: item.identifyingFeatures || '',
          status: item.status,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, user && user._id]);

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
    if (form.description.trim().length < 10) return setError('Description must be at least 10 characters');

    setBusy(true);
    try {
      const payload = { ...form };
      if (!(user && user.role === 'admin')) delete payload.status;

      if (file) {
        // multipart so the new photo travels with the text fields
        const body = new FormData();
        Object.entries(payload).forEach(([key, value]) => body.append(key, value));
        body.append('image', file);
        await api.put(`/items/${id}`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.put(`/items/${id}`, payload);
      }
      navigate(`/items/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (loading) return <Loader />;
  if (error && !form) return <div className="container section"><div className="alert alert-error">{error}</div></div>;
  if (!form) return null;

  return (
    <div className="container section">
      <span className="eyebrow">Edit report</span>
      <h1 className="h2">Update this report</h1>
      <p className="lead mb-3">Only you or an administrator can change this listing.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card card-pad" onSubmit={submit} noValidate>
        <div className="form-row">
          <div className="field">
            <label htmlFor="type">Type</label>
            <select id="type" className="select" value={form.type} onChange={change('type')}>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" className="select" value={form.category} onChange={change('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="title">Item name</label>
          <input id="title" className="input" value={form.title} onChange={change('title')} />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" className="textarea" value={form.description} onChange={change('description')} />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" className="input" value={form.location} onChange={change('location')} />
          </div>
          <div className="field">
            <label htmlFor="eventDate">Date</label>
            <input id="eventDate" type="date" className="input" value={form.eventDate} onChange={change('eventDate')} />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="identifyingFeatures">Identifying features</label>
            <input id="identifyingFeatures" className="input" value={form.identifyingFeatures} onChange={change('identifyingFeatures')} />
          </div>
          {/* Only an administrator may move a report through its lifecycle; the
              API enforces this too, so the field is hidden from ordinary owners. */}
          {user && user.role === 'admin' && (
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" className="select" value={form.status} onChange={change('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="image">Photo <span className="hint">(leave empty to keep the current photo)</span></label>
          <input id="image" type="file" className="input" accept="image/jpeg,image/png,image/webp" onChange={onFile} />
          {preview ? (
            <img src={preview} alt="New photo preview" style={{ marginTop: 10, maxHeight: 200, borderRadius: 10, border: '1px solid var(--line)' }} />
          ) : currentImage ? (
            <img src={currentImage} alt="Current photo" style={{ marginTop: 10, maxHeight: 200, borderRadius: 10, border: '1px solid var(--line)' }} />
          ) : null}
        </div>

        <div className="row">
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          <button className="btn btn-ghost" type="button" onClick={() => navigate(`/items/${id}`)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
