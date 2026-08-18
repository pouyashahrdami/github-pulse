import { NextResponse } from "next/server";
import { heartsBeating } from "@/lib/beats";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
};

export async function GET() {
  return NextResponse.json(await heartsBeating(), { headers: HEADERS });
}
