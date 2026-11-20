import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, PackageSearch, HandHeart, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../api/client.js';
import ItemCard from '../components/ItemCard.jsx';
import StatsRow from '../components/StatsRow.jsx';
import { CardSkeletonGrid } from '../components/Loader.jsx';

export default function Landing() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState({ lost: [], found: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, lostRes, foundRes] = await Promise.all([
          api.get('/items/stats'),
          api.get('/items', { params: { type: 'lost', limit: 3 } }),
          api.get('/items', { params: { type: 'found', limit: 3 } }),
        ]);
        setStats(statsRes.data.stats);
        setRecent({ lost: lostRes.data.items, found: foundRes.data.items });
      } catch (error) {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow" style={{ color: '#ffca4d' }}>Campus Lost &amp; Found</span>
            <h1>Lost something? Found something? One place solves both.</h1>
            <p>
              Report a lost belonging, publish what you found, and search every report on campus.
              No more scrolling through chat groups to find out whether someone already picked it up.
            </p>
            <div className="hero-actions">
              <Link to="/report" className="btn btn-accent">Report an item <ArrowRight size={16} /></Link>
              <Link to="/browse" className="btn btn-outline-light">Browse items</Link>
            </div>
          </div>

          <div className="hero-panel">
            <h3>Live numbers from the database</h3>
            <div className="row"><span>Total reports</span><strong>{stats ? stats.totalReports : '—'}</strong></div>
            <div className="row"><span>Lost reports</span><strong>{stats ? stats.lost : '—'}</strong></div>
            <div className="row"><span>Found reports</span><strong>{stats ? stats.found : '—'}</strong></div>
            <div className="row"><span>Recovered items</span><strong>{stats ? stats.recovered : '—'}</strong></div>
          </div>
        </div>
      </section>

      <section className="section container">
        <span className="eyebrow">Overview</span>
        <h2 className="h2">How the platform works</h2>
        <p className="lead mb-3">
          Three things happen here: someone reports a loss, someone publishes a find, and the two meet
          through a recovery request that the finder has to approve.
        </p>

        <div className="grid grid-3">
          <div className="card card-pad">
            <PackageSearch size={22} color="var(--navy-700)" />
            <h3 className="mt-1">Report a lost item</h3>
            <p className="small muted">Describe what you lost, where and when, and add a photo if you have one.</p>
          </div>
          <div className="card card-pad">
            <HandHeart size={22} color="var(--found)" />
            <h3 className="mt-1">Publish a found item</h3>
            <p className="small muted">Found something? List it so the owner can find it and request recovery.</p>
          </div>
          <div className="card card-pad">
            <ShieldCheck size={22} color="var(--accent-dark)" />
            <h3 className="mt-1">Recover safely</h3>
            <p className="small muted">The finder reviews each request and approves the right one before handover.</p>
          </div>
        </div>
      </section>

      <section className="section-tight container">
        {stats && (
          <StatsRow
            items={[
              { label: 'Total reports', value: stats.totalReports },
              { label: 'Lost', value: stats.lost },
              { label: 'Found', value: stats.found },
              { label: 'Recovered', value: stats.recovered },
            ]}
          />
        )}
      </section>

      <section className="section container">
        <div className="row-between mb-2">
          <div>
            <span className="eyebrow">Recently reported</span>
            <h2 className="h2">Lost items</h2>
          </div>
          <Link to="/browse?type=lost" className="btn btn-sm btn-ghost">See all lost <ArrowRight size={14} /></Link>
        </div>
        {loading ? <CardSkeletonGrid count={3} /> : (
          <div className="grid grid-3">
            {recent.lost.map((item) => <ItemCard key={item._id} item={item} />)}
          </div>
        )}
      </section>

      <section className="section-tight container">
        <div className="row-between mb-2">
          <div>
            <span className="eyebrow">Recently reported</span>
            <h2 className="h2">Found items</h2>
          </div>
          <Link to="/browse?type=found" className="btn btn-sm btn-ghost">See all found <ArrowRight size={14} /></Link>
        </div>
        {loading ? <CardSkeletonGrid count={3} /> : (
          <div className="grid grid-3">
            {recent.found.map((item) => <ItemCard key={item._id} item={item} />)}
          </div>
        )}
      </section>

      <section className="section container">
        <span className="eyebrow">Process</span>
        <h2 className="h2">Four steps from lost to recovered</h2>
        <div className="grid grid-4 mt-3">
          {[
            ['Report the item', 'Fill the form with title, category, location, date and an optional photo.'],
            ['Discover a match', 'Search by keyword, category, location and type, or check the matches shown after reporting.'],
            ['Request recovery', 'Explain why the item is yours. Only the person who found it can see and review it.'],
            ['Verify and collect', 'The finder approves one request. The item is marked recovered and the rest are closed.'],
          ].map(([title, text], index) => (
            <div className="card card-pad step" key={title}>
              <div className="step-num">{index + 1}</div>
              <div>
                <h3 style={{ fontSize: 15 }}>{title}</h3>
                <p className="small muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
