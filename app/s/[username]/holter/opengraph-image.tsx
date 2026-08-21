import { ImageResponse } from "next/og";
import { CHRONOTYPE_LABEL } from "@/lib/card";
import { fetchHolterSample } from "@/lib/github";
import { computeHolter } from "@/lib/holter";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  let stats;
  try {
    stats = computeHolter(await fetchHolterSample(username));
  } catch {
    stats = null;
  }
  const max = stats ? Math.max(...stats.hours, 1) : 1;

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
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 8,
            color: "#928DAD",
          }}
        >
          HOLTER MONITOR
        </div>
        <div style={{ display: "flex", fontSize: 46, marginTop: 10 }}>
          @{username}&apos;s 24-hour tape
        </div>
        {stats && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              marginTop: 44,
              height: 170,
            }}
          >
            {stats.hours.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: 30,
                  height: Math.max(6, Math.round((c / max) * 170)),
                  background:
                    c === 0
                      ? "#2A2440"
                      : i === stats.peakHour
                        ? "#2FD4EE"
                        : "#8B5CF6",
                  borderRadius: 5,
                }}
              />
            ))}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: 52,
            letterSpacing: 6,
            color: "#8B5CF6",
            border: "3px solid #8B5CF6",
            borderRadius: 999,
            padding: "10px 44px",
            marginTop: 44,
          }}
        >
          {stats ? CHRONOTYPE_LABEL[stats.chronotype] : "NO SIGNAL"}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#928DAD",
            marginTop: 36,
          }}
        >
          github pulse · when do you really code?
        </div>
      </div>
    ),
    size,
  );
}
