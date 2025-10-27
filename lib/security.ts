import type { NextRequest } from 'next/server'

type Bucket = {
  count: number
  expiresAt: number
}

const rateLimitBuckets = new Map<string, Bucket>()

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_LIMIT = 5

export type RateLimitOptions = {
  limit?: number
  windowMs?: number
}

export type RateLimitResult = {
  success: boolean
  retryAfterMs?: number
  remaining?: number
}

/**
 * Very small in-memory rate limiter. Suitable for prototypes only.
 */
export function consumeRateLimit(
  identifier: string,
  { limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS }: RateLimitOptions = {}
): RateLimitResult {
  const now = Date.now()
  const bucket = rateLimitBuckets.get(identifier)

  if (!bucket || bucket.expiresAt <= now) {
    rateLimitBuckets.set(identifier, {
      count: 1,
      expiresAt: now + windowMs
    })
    return { success: true, remaining: limit - 1 }
  }

  if (bucket.count >= limit) {
    return { success: false, retryAfterMs: bucket.expiresAt - now }
  }

  bucket.count += 1
  return { success: true, remaining: limit - bucket.count }
}

export function buildRateLimitKey(
  request: NextRequest,
  scope: string,
  extra?: string
): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ipCandidate = forwarded?.split(',')[0]?.trim()
  const ip = request.ip ?? ipCandidate ?? 'unknown'
  const ua = request.headers.get('user-agent') ?? 'unknown'
  return [scope, extra, ip, ua].filter(Boolean).join(':')
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

export type RegistrationValidationResult = {
  valid: boolean
  errors: string[]
  sanitized?: {
    name: string
    email: string
    password: string
  }
}

export function validateRegistrationInput(input: {
  name: string
  email: string
  password: string
}): RegistrationValidationResult {
  const errors: string[] = []
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (name.length < 2) {
    errors.push('Name must be at least 2 characters long.')
  }

  if (!emailRegex.test(email)) {
    errors.push('Enter a valid email address.')
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters.')
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push('Password must include uppercase, lowercase, and a number.')
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? { name, email, password } : undefined
  }
}
