import NextAuth from "next-auth"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { buildRateLimitKey, consumeRateLimit } from "@/lib/security"

const handler = NextAuth(authOptions)

export const GET = handler

export async function POST(
  request: NextRequest,
  ...rest: Parameters<typeof handler>
) {
  const rateLimitKey = buildRateLimitKey(request, "login")
  const rateLimitResult = consumeRateLimit(rateLimitKey, {
    limit: 10,
    windowMs: 60_000
  })

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many login attempts. Please slow down and try again." },
      {
        status: 429,
        headers: rateLimitResult.retryAfterMs
          ? { "Retry-After": Math.ceil(rateLimitResult.retryAfterMs / 1000).toString() }
          : undefined
      }
    )
  }

  return handler(request, ...rest)
}
