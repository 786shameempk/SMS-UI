// Step bookkeeping for the seeder: every step is reported, failures don't stop the run, and steps for modules a
// school's plan doesn't include are skipped (so a Starter school has no transport data, as in real use).
import { ApiError, pool } from "../lib.mjs";

export function createRunner({ concurrency }) {
  const report = [];

  async function step(scope, name, fn) {
    const t0 = Date.now();
    try {
      const detail = await fn();
      report.push({ scope, name, ok: true, detail });
      console.log(`  ✓ ${name}${detail ? ` - ${detail}` : ""} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    } catch (err) {
      report.push({ scope, name, ok: false, detail: err.message });
      console.log(`  ✗ ${name}: ${err instanceof ApiError ? err.message : err.stack}`);
    }
  }

  function skip(scope, name, why) {
    report.push({ scope, name, ok: true, skipped: true, detail: why });
    console.log(`  - ${name}: skipped (${why})`);
  }

  /** Runs a bulk create and reports how many succeeded; the first few errors are shown. */
  async function bulk(items, fn, limit = concurrency) {
    let ok = 0;
    const errors = [];
    const out = await pool(items, limit, async (item, i) => {
      try {
        const r = await fn(item, i);
        ok++;
        return r;
      } catch (err) {
        if (errors.length < 3) errors.push(err.message);
        return null;
      }
    });
    if (ok === 0 && items.length) throw new Error(`all ${items.length} failed: ${errors.join(" | ")}`);
    if (errors.length) console.log(`    ! ${items.length - ok} of ${items.length} failed, e.g. ${errors[0]}`);
    return { out, ok, total: items.length };
  }

  /**
   * A step runner for one scope (a branch or a tenant). `S(module, name, fn)` runs the step only when the school's
   * plan includes `module` (a Permission Matrix module name, e.g. "Fee Management"); `null` means always.
   */
  function scoped(scope, planModules) {
    return (module, name, fn) => {
      if (module && planModules && !planModules.includes(module)) return skip(scope, name, `"${module}" not in plan`);
      return step(scope, name, fn);
    };
  }

  return { report, step, skip, bulk, scoped };
}
