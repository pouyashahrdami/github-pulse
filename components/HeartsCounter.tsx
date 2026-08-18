"use client";

import { useEffect, useState } from "react";

/** "N hearts beating this week" — hidden until the number is worth bragging about. */
export default function HeartsCounter() {
  const [week, setWeek] = useState(0);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? (r.json() as Promise<{ week: number }>) : null))
      .then((s) => s && setWeek(s.week))
      .catch(() => {
        // cosmetic stat — a failed fetch just leaves it hidden
      });
  }, []);

  if (week < 5) return null;
  return (
    <p className="hearts">
      <span className="hearts-dot" aria-hidden />
      {week.toLocaleString("en-US")} hearts beating this week
    </p>
  );
}
