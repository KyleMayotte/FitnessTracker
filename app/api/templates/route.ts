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
    
    const template = {
      userEmail: session.user.email,
      name: body.name,
      exercises: body.exercises,
      createdAt: new Date()
    }
    
    const result = await db.collection('workout-templates').insertOne(template)
    
    return Response.json({ success: true, id: result.insertedId })
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    const templates = await db.collection('workout-templates')
      .find({ userEmail: session.user.email })
      .sort({ createdAt: -1 })
      .toArray()
    
    return Response.json({ templates })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'Missing template ID' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    
    const { ObjectId } = require('mongodb')
    await db.collection('workout-templates').deleteOne({
      _id: new ObjectId(id),
      userEmail: session.user.email
    })
    
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, exercises } = body

    if (!id || !name || !exercises) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    
    const { ObjectId } = require('mongodb')
    await db.collection('workout-templates').updateOne(
      {
        _id: new ObjectId(id),
        userEmail: session.user.email
      },
      {
        $set: {
          name: name,
          exercises: exercises,
          updatedAt: new Date()
        }
      }
    )
    
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}