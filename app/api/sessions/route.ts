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
    
    const workoutSession = {
      userEmail: session.user.email,
      templateId: body.templateId,
      templateName: body.templateName,
      exercises: body.exercises, // Array with sets data
      date: new Date()
    }
    
    const result = await db.collection('workout-sessions').insertOne(workoutSession)
    
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

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    
    let query: any = { userEmail: session.user.email }
    if (templateId) {
      query.templateId = templateId
    }
    
    const sessions = await db.collection('workout-sessions')
      .find(query)
      .sort({ date: -1 })
      .toArray()
    
    return Response.json({ sessions })
  } catch (e) {
    return Response.json({ error: e }, { status: 500 })
  }
}