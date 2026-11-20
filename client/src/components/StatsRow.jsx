export default function StatsRow({ items }) {
  return (
    <div className="stats-row">
      {items.map((stat) => (
        <div className="stat-card" key={stat.label}>
          <div className="stat-value">{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
