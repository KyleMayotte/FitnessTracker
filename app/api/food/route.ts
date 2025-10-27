import { NextRequest } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase token
    const authHeader = request.headers.get('authorization')
    const decodedToken = await verifyFirebaseToken(authHeader)
    
    if (!decodedToken?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    const body = await request.json()
    
    const food = {
      userEmail: body.userEmail || decodedToken.email,
      name: body.name,
      calories: body.calories,
      protein: body.protein,
      mealType: body.mealType || 'snack',
      date: body.date || new Date().toISOString().split('T')[0]
    }
    
    const result = await db.collection('food').insertOne(food)
    
    return Response.json({ ...food, _id: result.insertedId })
  } catch (e: any) {
    console.error('POST /api/food error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify Firebase token
    const authHeader = request.headers.get('authorization')
    const decodedToken = await verifyFirebaseToken(authHeader)
    
    if (!decodedToken?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('userEmail') || decodedToken.email

    const client = await clientPromise
    const db = client.db('fitness-tracker')
    const foods = await db.collection('food')
      .find({ userEmail })
      .sort({ date: -1 })
      .toArray()
    
    return Response.json(foods)
  } catch (e: any) {
    console.error('GET /api/food error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify Firebase token
    const authHeader = request.headers.get('authorization')
    const decodedToken = await verifyFirebaseToken(authHeader)
    
    if (!decodedToken?.email) {
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
      userEmail: decodedToken.email
    })
    
    return Response.json({ message: 'Food deleted successfully' })
  } catch (e: any) {
    console.error('DELETE /api/food error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
