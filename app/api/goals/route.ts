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
    
    // Update or insert goals for this user
    await db.collection('goals').updateOne(
      { userEmail: decodedToken.email },
      {
        $set: {
          userEmail: decodedToken.email,
          dailyCalories: body.dailyCalories,
          dailyProtein: body.dailyProtein,
          weeklyWorkouts: body.weeklyWorkouts,
          currentWeight: body.currentWeight,
          targetWeight: body.targetWeight,
          weightGoalType: body.weightGoalType,
          deadline: body.deadline,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )
    
    return Response.json({ success: true })
  } catch (e: any) {
    console.error('POST /api/goals error:', e)
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
    const goals = await db.collection('goals').findOne({ 
      userEmail 
    })
    
    return Response.json(goals || null)
  } catch (e: any) {
    console.error('GET /api/goals error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
