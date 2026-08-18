import { ImageResponse } from "next/og";
import { fetchGithubData } from "@/lib/github";
import { computePulse } from "@/lib/pulse";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

const STATE_COLORS: Record<string, string> = {
  radiant: "#8B5CF6",
  steady: "#8B5CF6",
  fading: "#F5B84B",
  critical: "#F5B84B",
  flatline: "#FF5A66",
  revived: "#2FD4EE",
};

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  let pulse;
  try {
    pulse = computePulse(await fetchGithubData(username));
  } catch {
    pulse = null;
  }
  const color = pulse ? (STATE_COLORS[pulse.state] ?? "#8B5CF6") : "#FF5A66";

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
        <div style={{ display: "flex", fontSize: 44, color: "#928DAD" }}>
          @{username}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 24,
            marginTop: 12,
          }}
        >
          <div style={{ display: "flex", fontSize: 160, fontWeight: 700 }}>
            {pulse ? (pulse.state === "flatline" ? "—" : pulse.bpm) : "?"}
          </div>
          <div style={{ display: "flex", fontSize: 48, color: "#928DAD" }}>
            bpm
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 40,
            letterSpacing: 6,
            color,
            border: `3px solid ${color}`,
            borderRadius: 999,
            padding: "8px 36px",
            marginTop: 8,
          }}
        >
          {pulse ? pulse.state.toUpperCase() : "NOT FOUND"}
        </div>
        {pulse && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              marginTop: 48,
              height: 120,
            }}
          >
            {pulse.beats.map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: 28,
                  height: Math.max(8, Math.round(b * 120)),
                  background: b === 0 ? "#2A2440" : color,
                  borderRadius: 6,
                }}
              />
            ))}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#928DAD",
            marginTop: 40,
          }}
        >
          github pulse · a living EKG for your README
        </div>
      </div>
    ),
    size,
  );
}
