import { ImageResponse } from "next/og";
import { money } from "@/lib/format";
import { loadResults, standings } from "@/lib/results";

export const dynamic = "force-static";

const COLOR = { pass: "#0F8B8D", fail: "#C93C34", error: "#8E9BAD", none: "#DCE3EB" } as const;

export async function GET() {
  const res = loadResults();
  const size = { width: 1200, height: 630 };
  if (!res) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: "#EEF2F6", color: "#101A2A", alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 700 }}>
          Orbio Bench
        </div>
      ),
      size,
    );
  }

  const rows = standings(res);
  const ranked = rows.filter((r) => r.costPerPass !== null).sort((a, b) => a.costPerPass! - b.costPerPass!);
  const best = ranked[0];
  const board = ranked.slice(0, 5);
  const demo = res.source === "mock";

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#EEF2F6", color: "#101A2A", padding: 56 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>Orbio Bench</div>
          {demo && (
            <div style={{ display: "flex", background: "#F5E7C8", color: "#7A4F0C", fontSize: 24, fontWeight: 700, padding: "6px 16px", borderRadius: 6 }}>
              DEMO DATA
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#5B6B80" }}>Most passing code per dollar</div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 }}>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 700 }}>{best ? best.model.label : "No result"}</div>
            {best && (
              <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#0B6E70", marginLeft: 28 }}>{money(best.costPerPass)} per pass</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 20, borderTop: "2px solid #101A2A" }}>
          {board.map((r, i) => (
            <div key={r.model.id} style={{ display: "flex", alignItems: "center", height: 54, borderBottom: "1px solid #DCE3EB" }}>
              <div style={{ display: "flex", width: 44, fontSize: 28, fontWeight: 700, color: "#5B6B80" }}>{i + 1}</div>
              <div style={{ display: "flex", width: 330, fontSize: 30, fontWeight: 700 }}>{r.model.label}</div>
              <div style={{ display: "flex", flex: 1 }}>
                {res.tasks.map((t, j) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      width: 24,
                      height: 32,
                      borderRadius: 4,
                      marginRight: j === 4 ? 16 : 4,
                      background: COLOR[r.cells[t.id] ?? "none"],
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", width: 110, justifyContent: "flex-end", fontSize: 26, color: "#5B6B80" }}>{`${Math.round(r.passRate * 100)}%`}</div>
              <div style={{ display: "flex", width: 170, justifyContent: "flex-end", fontSize: 30, fontWeight: 700 }}>{money(r.costPerPass)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", paddingTop: 12, fontSize: 22, color: "#5B6B80" }}>
          {`${rows.length} models, ${res.tasks.length} tasks, graded on hidden tests, measured through one Orbio key`}
        </div>
      </div>
    ),
    size,
  );
}
