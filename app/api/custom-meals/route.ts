import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const decodedToken = await verifyFirebaseToken(authHeader)

    if (!decodedToken?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, foods } = body

    if (!name || !foods || !Array.isArray(foods)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const customMeal = {
      userEmail: decodedToken.email,
      name,
      foods,
      createdAt: new Date(),
    }

    const result = await db.collection('customMeals').insertOne(customMeal)

    return NextResponse.json({
      success: true,
      meal: {
        _id: result.insertedId.toString(),
        ...customMeal,
      },
    })
  } catch (error) {
    console.error('Error saving custom meal:', error)
    return NextResponse.json({ error: 'Failed to save custom meal' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const decodedToken = await verifyFirebaseToken(authHeader)

    if (!decodedToken?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()

    const customMeals = await db
      .collection('customMeals')
      .find({ userEmail: decodedToken.email })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      meals: customMeals.map(meal => ({
        ...meal,
        _id: meal._id.toString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching custom meals:', error)
    return NextResponse.json({ error: 'Failed to fetch custom meals' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const decodedToken = await verifyFirebaseToken(authHeader)

    if (!decodedToken?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mealId = searchParams.get('id')

    if (!mealId) {
      return NextResponse.json({ error: 'Meal ID is required' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const { ObjectId } = await import('mongodb')

    const result = await db.collection('customMeals').deleteOne({
      _id: new ObjectId(mealId),
      userEmail: decodedToken.email,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Custom meal not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting custom meal:', error)
    return NextResponse.json({ error: 'Failed to delete custom meal' }, { status: 500 })
  }
}
