import { PackageSearch } from 'lucide-react';

export default function EmptyState({ title = 'Nothing here yet', text = '', action = null }) {
  return (
    <div className="empty">
      <PackageSearch size={34} style={{ marginBottom: 10, opacity: 0.5 }} />
      <h3 style={{ color: 'var(--ink)', marginBottom: 6 }}>{title}</h3>
      {text && <p className="small">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
