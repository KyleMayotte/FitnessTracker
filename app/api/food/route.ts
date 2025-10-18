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
    
    const food = {
      userEmail: session.user.email,
      name: body.name,
      calories: body.calories,
      protein: body.protein,
      mealType: body.mealType || 'snack',
      date: new Date()
    }
    
    const result = await db.collection('food').insertOne(food)
    
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
    const foods = await db.collection('food')
      .find({ userEmail: session.user.email })
      .sort({ date: -1 })
      .toArray()
    
    return Response.json({ foods })
  } catch (e) {
    return Response.json({ error: e }, { status: 500 })
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
      return Response.json({ error: 'Missing food ID' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    
    const { ObjectId } = require('mongodb')
    await db.collection('food').deleteOne({
      _id: new ObjectId(id),
      userEmail: session.user.email
    })
    
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}