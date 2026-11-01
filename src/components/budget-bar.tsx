import { formatINR } from "@/lib/format";

/**
 * Horizontal budget bar with readable numeric values alongside the chart.
 * Shows allocated (track) and spent (fill) for one category.
 */
export function BudgetBar({
  label,
  allocatedPaise,
  spentPaise,
  maxPaise,
}: {
  label: string;
  allocatedPaise: number;
  spentPaise: number;
  maxPaise: number;
}) {
  const trackPct = maxPaise > 0 ? Math.min(100, (allocatedPaise / maxPaise) * 100) : 0;
  const fillPct = allocatedPaise > 0 ? Math.min(100, (spentPaise / allocatedPaise) * 100) : 0;
  const over = spentPaise > allocatedPaise;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {formatINR(spentPaise)} spent of {formatINR(allocatedPaise)}
        </span>
      </div>
      <div
        className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label}: ${formatINR(spentPaise)} spent of ${formatINR(allocatedPaise)} allocated`}
      >
        <div className="h-full rounded-full bg-secondary" style={{ width: `${trackPct}%` }}>
          <div
            className={`h-full rounded-full ${over ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
