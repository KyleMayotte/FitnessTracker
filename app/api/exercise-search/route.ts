import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query || query.length < 2) {
      return Response.json({ exercises: [] })
    }

    const response = await fetch(
      `https://api.api-ninjas.com/v1/exercises?name=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Api-Key': process.env.EXERCISE_API_KEY || ''
        }
      }
    )

    const data = await response.json()

    // Format and deduplicate exercises
    const exercises = data.map((ex: any) => ({
      name: ex.name,
      muscle: ex.muscle,
      equipment: ex.equipment,
      difficulty: ex.difficulty
    }))

    // Remove duplicates by name
    const unique = exercises.filter((ex: any, index: number, self: any[]) => 
      index === self.findIndex((e) => e.name === ex.name)
    )

    return Response.json({ exercises: unique.slice(0, 10) })
  } catch (e) {
    return Response.json({ exercises: [], error: String(e) })
  }
}