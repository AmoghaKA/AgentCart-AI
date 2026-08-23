import { activity } from "@/lib/mockData";

export function RecentActivity() {
  return (
    <section className="activity-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">LIVE FEED</p>
          <h2>Recent Agent Activity</h2>
        </div>
        <button className="text-button">
          View all <span>↗</span>
        </button>
      </div>
      <div className="activity-list">
        {activity.map((item) => (
          <div className="activity-item" key={item.title}>
            <div className={`activity-icon status-${item.status.toLowerCase()}`}>
              {item.icon}
            </div>
            <div className="activity-copy">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            <span className={`activity-status status-text-${item.status.toLowerCase()}`}>
              {item.status}
            </span>
            <time>{item.time}</time>
          </div>
        ))}
      </div>
    </section>
  );
}
