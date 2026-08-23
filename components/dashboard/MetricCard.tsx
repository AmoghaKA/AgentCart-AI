type Metric = {
  label: string;
  value: string;
  detail: string;
  tone: string;
  change?: string;
};

const icons = ["₹", "↗", "✦", "#"];

export function MetricCard({
  metric,
  index,
}: {
  metric: Metric;
  index: number;
}) {
  return (
    <article className={`metric-card metric-${metric.tone}`}>
      <div className="metric-top">
        <span className="metric-label">{metric.label}</span>
        <span className={`metric-icon metric-icon-${index}`}>
          {icons[index]}
        </span>
      </div>
      <p className="metric-value">{metric.value}</p>
      <div className="metric-foot">
        <span>{metric.detail}</span>
        {metric.change && <strong>{metric.change}</strong>}
      </div>
    </article>
  );
}
