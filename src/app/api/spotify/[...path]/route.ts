import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const API_BASE = "https://api.spotify.com/v1";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const token = process.env.SPOTIFY_API;
  if (!token) return NextResponse.json({ message: "Configure SPOTIFY_API no ambiente local do Next.js." }, { status: 503 });
  const { path } = await params;
  const upstreamUrl = new URL(`${API_BASE}/${path.map(encodeURIComponent).join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => upstreamUrl.searchParams.append(key, value));
  const response = await fetch(upstreamUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const body = await response.text();
  return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
}
