import { ImageResponse } from "next/og";

export const alt = "GitHub Pulse — a living EKG for your README";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TRACE =
  "M0 100 H210 q10 -14 20 0 h24 l8 10 l16 -84 l16 118 l8 -44 h24 q14 -24 28 0 " +
  "H460 q10 -14 20 0 h24 l8 10 l16 -64 l16 96 l8 -42 h24 q14 -24 28 0 " +
  "H710 q10 -14 20 0 h24 l8 10 l16 -74 l16 108 l8 -44 h24 q14 -24 28 0 H1100";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#08070F",
          gap: 10,
        }}
      >
        <svg width="1100" height="200" viewBox="0 0 1100 200">
          <path
            d={TRACE}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d={TRACE}
            fill="none"
            stroke="#2FD4EE"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
        <div
          style={{
            display: "flex",
            fontSize: 82,
            fontWeight: 700,
            color: "#EDEBF6",
            letterSpacing: -2,
          }}
        >
          GitHub Pulse
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#928DAD" }}>
          a living EKG for your README — it beats when you ship
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 24,
            color: "#2FD4EE",
            padding: "12px 34px",
            borderRadius: 999,
            border: "1px solid #2F2B4A",
            background: "#100F1C",
          }}
        >
          one username in · a beating heart out · free
        </div>
      </div>
    ),
    size,
  );
}
