import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import clientPromise from '@/lib/mongodb'
import {
  buildRateLimitKey,
  consumeRateLimit,
  validateRegistrationInput
} from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateRegistrationInput(body)

    if (!validation.valid || !validation.sanitized) {
      return Response.json(
        { error: validation.errors[0] ?? 'Invalid registration details.' },
        { status: 400 }
      )
    }

    const { name, email, password } = validation.sanitized
    const rateLimitKey = buildRateLimitKey(request, 'register', email)
    const rateLimitResult = consumeRateLimit(rateLimitKey, {
      limit: 5,
      windowMs: 60_000
    })

    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Too many attempts. Please wait a minute and try again.' },
        {
          status: 429,
          headers: rateLimitResult.retryAfterMs
            ? { 'Retry-After': Math.ceil(rateLimitResult.retryAfterMs / 1000).toString() }
            : undefined
        }
      )
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    const existingUser = await db.collection('users').findOne({ email })
    if (existingUser) {
      return Response.json(
        { error: 'Unable to register with those credentials.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await db.collection('users').insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    })

    return Response.json({ 
      success: true, 
      userId: result.insertedId 
    })
  } catch (e) {
    return Response.json({ error: 'Registration failed' }, { status: 500 })
  }
}
