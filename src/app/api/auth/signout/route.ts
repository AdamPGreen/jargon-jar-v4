import { NextResponse, type NextRequest } from "next/server"
import { clearDashboardSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  clearDashboardSession()
  return NextResponse.redirect(new URL("/", request.url))
}
