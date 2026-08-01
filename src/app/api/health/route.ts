import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Health check for the container and any uptime monitor.
 *
 * Verifies the database is actually reachable, not merely that the process is
 * alive — a Next server happily serves 200s while Postgres is down, which is
 * exactly the state you want an alert for.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
