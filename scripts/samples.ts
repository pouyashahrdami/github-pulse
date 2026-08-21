/**
 * Regenerates the committed README sample SVGs that need deterministic,
 * ideal-looking data (a ward with a flatline in it, a full-year report, a
 * nocturnal holter). Synthetic patients from lib/demo — the same cast the
 * builder's live /demo/<mode> preview renders. Run from the repo root:
 *
 *   npx -y tsx scripts/samples.ts
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_OPTIONS,
  renderHolterCard,
  renderReportCard,
  renderWardCard,
} from "../lib/card";
import { demoHolterSample, demoPatient, demoYear } from "../lib/demo";
import { computeHolter } from "../lib/holter";
import { computeReport } from "../lib/report";
import { THEMES } from "../lib/themes";

const out = (rel: string) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

const ward = renderWardCard(
  [
    demoPatient("nova", "radiant", 172, 7, 0.85),
    demoPatient("lin", "steady", 96, 21, 0.6),
    demoPatient("sam", "fading", 44, 33, 0.3),
    demoPatient("ghost", "flatline", 0, 5, 0),
  ],
  THEMES.phosphor,
  DEFAULT_OPTIONS,
);
writeFileSync(out("assets/sample-ward.svg"), ward);

const report = renderReportCard(
  demoPatient("nova", "steady", 84, 11, 0.7),
  computeReport(demoYear()),
  THEMES.paper,
  DEFAULT_OPTIONS,
  "2026-08-18",
);
writeFileSync(out("assets/sample-report.svg"), report);

const holter = renderHolterCard(
  "nova",
  computeHolter(demoHolterSample()),
  THEMES.aura,
  DEFAULT_OPTIONS,
  "2026-08-18",
);
writeFileSync(out("assets/sample-holter.svg"), holter);

console.log(
  "wrote assets/sample-ward.svg, assets/sample-report.svg, assets/sample-holter.svg",
);
