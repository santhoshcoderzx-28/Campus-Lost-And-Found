import { Link } from 'react-router-dom';
import { MapPin, Calendar, Package } from 'lucide-react';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function ItemCard({ item }) {
  return (
    <article className="card item-card">
      {item.imageUrl ? (
        <div className="item-media" style={{ backgroundImage: `url(${item.imageUrl})` }} />
      ) : (
        <div className="item-media"><Package size={30} /></div>
      )}

      <div className="item-body">
        <div className="row">
          <span className={`badge badge-${item.type}`}>{item.type}</span>
          <span className={`badge badge-${item.status}`}>{item.status}</span>
        </div>

        <Link to={`/items/${item._id}`} className="item-title">{item.title}</Link>

        <div className="item-meta"><MapPin size={13} /> {item.location}</div>
        <div className="item-meta"><Calendar size={13} /> {formatDate(item.eventDate)}</div>
        <div className="item-meta">{item.category}</div>

        <div className="mt-1">
          <Link to={`/items/${item._id}`} className="btn btn-sm btn-ghost">View details</Link>
        </div>
      </div>
    </article>
  );
}
