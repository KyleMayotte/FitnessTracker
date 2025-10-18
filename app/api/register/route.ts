import { NextRequest } from 'next/server'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()
    
    if (!name || !email || !password) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email })
    if (existingUser) {
      return Response.json({ error: 'User already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Create user
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