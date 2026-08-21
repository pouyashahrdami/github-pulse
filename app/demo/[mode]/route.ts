import { NextRequest, NextResponse } from "next/server";
import {
  renderCard,
  renderDuetCard,
  renderHolterCard,
  renderReportCard,
  renderWardCard,
} from "@/lib/card";
import { demoHolterSample, demoPatient, demoYear } from "@/lib/demo";
import { computeHolter } from "@/lib/holter";
import { forceState } from "@/lib/pulse";
import { computeReport } from "@/lib/report";
import { resolveTheme } from "@/lib/themes";
import { parseOptions, parseState, parseTzMinutes } from "@/lib/options";

/**
 * Live demo cards for the builder's empty preview — synthetic patients
 * rendered through the real engine, so every theme/size/wave/extras click
 * shows its effect before a visitor types a username. No GitHub calls,
 * no beat counting: fiction stays off the wall and out of the stats.
 */

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
};

const DEMO_MODES = [
  "user",
  "repo",
  "org",
  "duet",
  "ward",
  "report",
  "holter",
] as const;
type DemoMode = (typeof DEMO_MODES)[number];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mode: string }> },
) {
  const { mode } = await params;
  if (!(DEMO_MODES as readonly string[]).includes(mode)) {
    return new NextResponse("unknown demo mode", { status: 400 });
  }
  const search = req.nextUrl.searchParams;
  const theme = resolveTheme(search, `demo:${mode}`);
  const options = parseOptions(search);
  const previewState = parseState(search);

  const nova = demoPatient("nova", "radiant", 172, 7, 0.85);
  const lin = demoPatient("lin", "steady", 96, 21, 0.6);

  let svg: string;
  switch (mode as DemoMode) {
    case "user": {
      const p = previewState ? forceState(nova, previewState) : nova;
      svg = renderCard(p, theme, options);
      break;
    }
    case "repo":
      svg = renderCard(demoPatient("acme/rocket", "steady", 96, 19, 0.6), theme, {
        ...options,
        label: options.label ?? "acme/rocket",
      });
      break;
    case "org":
      svg = renderCard(
        demoPatient("acme-inc", "steady", 128, 27, 0.75),
        theme,
        options,
      );
      break;
    case "duet":
      svg = renderDuetCard(nova, lin, theme, options);
      break;
    case "ward":
      svg = renderWardCard(
        [
          nova,
          lin,
          demoPatient("sam", "fading", 44, 33, 0.3),
          demoPatient("ghost", "flatline", 0, 5, 0),
        ],
        theme,
        options,
      );
      break;
    case "report":
      svg = renderReportCard(
        demoPatient("nova", "steady", 84, 11, 0.7),
        computeReport(demoYear()),
        theme,
        options,
        "2026-08-18",
      );
      break;
    case "holter":
      svg = renderHolterCard(
        "nova",
        computeHolter(demoHolterSample(), parseTzMinutes(search)),
        theme,
        options,
        "2026-08-18",
      );
      break;
  }
  return new NextResponse(svg, { headers: SVG_HEADERS });
}
