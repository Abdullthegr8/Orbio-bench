import { TASKS } from "../src/lib/tasks";
import { runHarness, countOk } from "../src/lib/sandbox";

async function main() {
  let bad = 0;
  for (const t of TASKS) {
    const all = [...t.visible, ...t.hidden];
    const ref = await runHarness(t.reference, t.fn, all);
    const refOk = ref.results.length === all.length && countOk(ref) === all.length;
    let starterNote = "";
    let starterOk = true;
    if (t.starter) {
      const s = await runHarness(t.starter, t.fn, t.visible);
      const failed = s.crashed ? t.visible.length : t.visible.length - countOk(s);
      starterOk = failed > 0;
      starterNote = ` | starter fails ${failed}/${t.visible.length} visible`;
    }
    const ok = refOk && starterOk;
    if (!ok) bad++;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${t.id.padEnd(18)} reference ${countOk(ref)}/${all.length}${starterNote}`,
    );
    if (!refOk) console.log("     ", JSON.stringify(ref.results.filter((x) => !x.ok).slice(0, 3)), ref.crashed ?? "");
  }
  process.exit(bad ? 1 : 0);
}
main();
