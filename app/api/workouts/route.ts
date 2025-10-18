import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    const body = await request.json()
    
    const workout = {
      userEmail: session.user.email,
      type: body.type,
      name: body.name,
      value: body.value,
      date: new Date()
    }
    
    const result = await db.collection('workouts').insertOne(workout)
    
    return Response.json({ success: true, id: result.insertedId })
  } catch (e) {
    return Response.json({ success: false, error: e }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    const workouts = await db.collection('workouts')
      .find({ userEmail: session.user.email })
      .sort({ date: -1 })
      .toArray()
    
    return Response.json({ workouts })
  } catch (e) {
    return Response.json({ error: e }, { status: 500 })
  }
}