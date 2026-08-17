import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub Pulse — a living EKG for your README",
  description:
    "One username in, a beating heart out. An animated pulse card that decays when you stop shipping and revives when you come back. Free, no login, fully color-customizable.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
