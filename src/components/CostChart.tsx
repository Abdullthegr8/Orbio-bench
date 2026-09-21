import { money } from "@/lib/format";
import type { Standing } from "@/lib/results";

export default function CostChart({ rows }: { rows: Standing[] }) {
  const priced = rows.filter((r) => r.costPerPass !== null).sort((a, b) => a.costPerPass! - b.costPerPass!);
  const unpriced = rows.filter((r) => r.costPerPass === null);
  const max = Math.max(...priced.map((r) => r.costPerPass!), 1e-9);

  return (
    <div>
      <ol>
        {priced.map((r, i) => (
          <li key={r.model.id} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-track py-3 sm:grid-cols-[1.75rem_11rem_1fr_5.5rem]">
            <span className="num text-xl font-semibold text-slate">{i + 1}</span>
            <span className="min-w-0 truncate font-display font-semibold">{r.model.label}</span>
            <span className="num col-start-3 text-right font-bold sm:col-start-4">{money(r.costPerPass)}</span>
            <span aria-hidden className="col-span-3 col-start-1 h-2.5 rounded-[3px] bg-track sm:col-span-1 sm:col-start-3 sm:row-start-1">
              <span className="block h-full rounded-[3px] bg-teal" style={{ width: `${Math.max(2, (r.costPerPass! / max) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ol>
      {unpriced.length > 0 && (
        <p className="mt-3 text-sm text-slate">
          Not ranked, no passing tasks or no cost reported: {unpriced.map((r) => r.model.label).join(", ")}.
        </p>
      )}
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate">
        Cost per pass is total spend divided by tasks passed. A cheap model that fails often can cost more per pass than a pricier one that does not.
      </p>
    </div>
  );
}
