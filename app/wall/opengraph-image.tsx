import { ImageResponse } from "next/og";
import { heartsBeating } from "@/lib/beats";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

const PALETTE = ["#8B5CF6", "#2FD4EE", "#F26DB8", "#F5B84B", "#3FDD8C"];

/** Deterministic bar heights per tile — a mosaic, not a lottery. */
const bars = (seed: number) =>
  Array.from({ length: 5 }, (_, i) => 14 + ((seed * 37 + i * 29) % 46));

export default async function Image() {
  const hearts = await heartsBeating();
  const subtitle =
    hearts.durable && hearts.week >= 5
      ? `${hearts.week.toLocaleString("en-US")} hearts beating this week`
      : "the most recently beating cards, live";
  const tiles = Array.from({ length: 18 }, (_, i) => ({
    color: PALETTE[i % PALETTE.length],
    heights: bars(i + 1),
  }));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#0B0819",
          color: "#EDEBF6",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: 10 }}>
          WALL OF HEARTS
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#928DAD", marginTop: 10 }}>
          {subtitle}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 18,
            width: 1080,
            marginTop: 48,
          }}
        >
          {tiles.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 8,
                width: 160,
                height: 92,
                background: "#14102A",
                borderRadius: 14,
                paddingBottom: 14,
              }}
            >
              {t.heights.map((h, j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    width: 14,
                    height: h,
                    background: t.color,
                    borderRadius: 4,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#928DAD", marginTop: 44 }}>
          github pulse · embed your card and join the wall
        </div>
      </div>
    ),
    size,
  );
}
