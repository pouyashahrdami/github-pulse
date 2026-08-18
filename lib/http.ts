import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * 200 with a content-derived ETag, or 304 when the client already has this
 * exact card — camo and browsers revalidate for free instead of re-downloading.
 */
export function cachedSvg(
  req: NextRequest,
  svg: string,
  headers: Record<string, string>,
): NextResponse {
  const etag = `"${createHash("sha1").update(svg).digest("base64url").slice(0, 16)}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ...headers, ETag: etag },
    });
  }
  return new NextResponse(svg, {
    status: 200,
    headers: { ...headers, ETag: etag },
  });
}
