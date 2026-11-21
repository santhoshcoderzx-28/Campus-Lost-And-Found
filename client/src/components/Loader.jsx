export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="center">
      <div className="spinner" />
      <p className="muted small">{label}</p>
    </div>
  );
}

export function CardSkeletonGrid({ count = 9 }) {
  return (
    <div className="grid grid-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
