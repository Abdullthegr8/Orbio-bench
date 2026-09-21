import Link from "next/link";
import { modelSlug, money } from "@/lib/format";
import { TIER_LABEL } from "@/lib/models";
import type { Standing } from "@/lib/results";
import { STATUS_META, statusOf } from "@/lib/status";
import type { Tier } from "@/lib/types";

interface TaskMeta {
  id: string;
  title: string;
  category: "coding" | "agentic";
}

const TIERS: Tier[] = ["frontier", "mid", "cheap"];
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function Bar({ s, tasks }: { s: Standing; tasks: TaskMeta[] }) {
  const groups = [
    { name: "Write from spec", items: tasks.filter((t) => t.category === "coding") },
    { name: "Fix with tools", items: tasks.filter((t) => t.category === "agentic") },
  ];
  return (
    <div role="img" aria-label={`${s.passes} of ${s.attempted} scored tasks passed`}>
      <div className="flex gap-2">
        {groups.map((g) => (
          <div key={g.name} className="flex gap-[3px]" style={{ flexGrow: g.items.length, flexBasis: 0 }}>
            {g.items.map((t) => {
              const v = s.cells[t.id];
              const color = v === "pass" ? "bg-teal" : v === "fail" ? "bg-brick" : v === "error" ? "cell-error" : "bg-track";
              return <span key={t.id} title={`${t.title}: ${v ?? "not run"}`} className={`h-9 flex-1 rounded-[3px] ${color}`} />;
            })}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 text-xs text-slate">
        {groups.map((g) => (
          <span key={g.name} style={{ flexGrow: g.items.length, flexBasis: 0 }}>
            {g.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function StatusBoard({ rows, tasks }: { rows: Standing[]; tasks: TaskMeta[] }) {
  return (
    <div className="space-y-10">
      {TIERS.map((tier) => {
        const group = rows.filter((r) => r.model.tier === tier);
        if (!group.length) return null;
        return (
          <section key={tier} aria-labelledby={`tier-${tier}`}>
            <h3 id={`tier-${tier}`} className="border-b border-ink pb-2 font-display text-lg font-semibold">
              {TIER_LABEL[tier]} models
            </h3>
            <ul>
              {group.map((s) => {
                const st = STATUS_META[statusOf(s)];
                return (
                  <li key={s.model.id} className="relative border-b border-track py-5 hover:bg-white/50">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-display text-lg font-semibold">
                        <Link href={`/model/${modelSlug(s.model.id)}`} className="after:absolute after:inset-0 hover:underline">
                          {s.model.label}
                        </Link>
                      </p>
                      <p className={`flex shrink-0 items-center gap-2 text-sm font-semibold ${st.text}`}>
                        <span aria-hidden className={`inline-block h-3 w-3 rounded-full ${st.dot}`} />
                        {st.label}
                      </p>
                    </div>
                    <div className="mt-3">
                      <Bar s={s} tasks={tasks} />
                    </div>
                    <p className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate">
                      <span>
                        <span className="num font-semibold text-ink">{Math.round(s.passRate * 100)}%</span> pass rate
                      </span>
                      <span>
                        <span className="num font-semibold text-ink">{money(s.costPerPass)}</span> per pass
                      </span>
                      <span>
                        <span className="num font-semibold text-ink">{secs(s.p50Ms)}</span> median
                      </span>
                      {s.errors > 0 && <span className="font-medium text-amberdark">{s.errors} errored, not counted</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
