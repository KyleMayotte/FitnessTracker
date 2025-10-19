import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')

    const weights = await db
      .collection('weight-entries')
      .find({ userEmail: session.user.email })
      .sort({ date: -1 })
      .toArray()

    return Response.json({ weights })
  } catch (e) {
    console.error('Weight fetch error:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { weight, date } = body

    if (!weight || weight <= 0) {
      return Response.json({ error: 'Invalid weight' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')

    const weightEntry = {
      userEmail: session.user.email,
      weight: parseFloat(weight),
      date: date ? new Date(date) : new Date(),
      createdAt: new Date()
    }

    await db.collection('weight-entries').insertOne(weightEntry)

    return Response.json({ success: true, weightEntry })
  } catch (e) {
    console.error('Weight save error:', e)
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
      return Response.json({ error: 'ID required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    const { ObjectId } = require('mongodb')

    await db.collection('weight-entries').deleteOne({
      _id: new ObjectId(id),
      userEmail: session.user.email
    })

    return Response.json({ success: true })
  } catch (e) {
    console.error('Weight delete error:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
