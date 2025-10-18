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
    
    // Update or insert goals for this user
    await db.collection('goals').updateOne(
      { userEmail: session.user.email },
      {
        $set: {
          userEmail: session.user.email,
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
  } catch (e) {
    return Response.json({ success: false, error: e }, { status: 500 })
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
    const goals = await db.collection('goals').findOne({ 
      userEmail: session.user.email 
    })
    
    return Response.json({ goals })
  } catch (e) {
    return Response.json({ error: e }, { status: 500 })
  }
}