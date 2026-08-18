import type { Metadata } from "next";
import "./globals.css";

const description =
  "One username in, a beating heart out. An animated pulse card that decays when you stop shipping and revives when you come back. Free, no login, fully color-customizable.";

export const metadata: Metadata = {
  title: "GitHub Pulse — a living EKG for your README",
  description,
  keywords: [
    "github",
    "readme",
    "profile",
    "stats",
    "card",
    "svg",
    "animated",
    "ekg",
    "heartbeat",
  ],
  openGraph: {
    title: "GitHub Pulse — a living EKG for your README",
    description,
    type: "website",
    siteName: "GitHub Pulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Pulse — a living EKG for your README",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: The landing page is itself a patient monitor — the product's EKG conceit
rendered as interface. Refuses the centered gradient-hero dark-SaaS template.
OWN-WORLD: Near-black monitor ground with faint graticule; violet trace +
cyan telemetry; amber/red reserved for warnings; one warm chart-paper strip
(millimeter grid) for the printed embed; all-mono type, letter-spaced caps
readouts, 1px lines, square corners, corner ticks, one blinking LED.
STORY: A developer sees a live card beating, understands their README can have
vitals, files an intake for their own, leaves with a copy-paste embed and an
explicit wall opt-in choice.
FIRST VIEWPORT: Thin status readout bar; left: mono headline + tagline +
intake; right: live demo card in a bezel labeled LIVE; ECG rule beneath.
FORM: hospital-monitor, user-pinned (no seed roll).
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
