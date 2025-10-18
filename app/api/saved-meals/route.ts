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
    
    const savedMeal = {
      userEmail: session.user.email,
      name: body.name,
      foods: body.foods, // Array of {name, calories, protein}
      totalCalories: body.totalCalories,
      totalProtein: body.totalProtein,
      createdAt: new Date()
    }
    
    const result = await db.collection('saved-meals').insertOne(savedMeal)
    
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
    const savedMeals = await db.collection('saved-meals')
      .find({ userEmail: session.user.email })
      .sort({ createdAt: -1 })
      .toArray()
    
    return Response.json({ savedMeals })
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
      return Response.json({ error: 'Missing meal ID' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    
    const { ObjectId } = require('mongodb')
    await db.collection('saved-meals').deleteOne({
      _id: new ObjectId(id),
      userEmail: session.user.email
    })
    
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}