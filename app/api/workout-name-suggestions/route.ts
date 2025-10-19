import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''

    if (query.length < 2) {
      return Response.json({ suggestions: [] })
    }

    const prompt = `Generate 5 creative and specific workout template names that start with or are related to "${query}".

These should be common workout split names or workout types that a fitness enthusiast would use.

Examples of good workout names:
- Push Day
- Pull Day
- Leg Day
- Upper Body Power
- Lower Body Hypertrophy
- Full Body Strength
- Chest and Triceps
- Back and Biceps
- Shoulders and Arms
- Core and Cardio
- HIIT Circuit
- Powerlifting Day
- Olympic Lifting
- CrossFit WOD
- Bodybuilding Pump
- Athletic Performance
- Functional Fitness

Return ONLY a JSON array of 5 workout name strings, no other text.
Format: ["Name 1", "Name 2", "Name 3", "Name 4", "Name 5"]`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a fitness expert who suggests creative workout template names. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    })

    const response = completion.choices[0].message.content

    // Parse the JSON response
    let suggestions
    try {
      suggestions = JSON.parse(response || '[]')
    } catch (e) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = response?.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        // Fallback to common workout names if AI fails
        suggestions = [
          "Push Day",
          "Pull Day",
          "Leg Day",
          "Upper Body",
          "Lower Body"
        ].filter(name => name.toLowerCase().includes(query.toLowerCase()))
      }
    }

    return Response.json({ suggestions: suggestions.slice(0, 5) })
  } catch (e) {
    console.error('Workout name suggestion error:', e)

    // Return fallback suggestions on error
    const fallbackSuggestions = [
      "Push Day",
      "Pull Day",
      "Leg Day",
      "Upper Body",
      "Lower Body",
      "Full Body",
      "Chest & Triceps",
      "Back & Biceps",
      "Shoulders & Arms",
      "Core & Cardio"
    ]

    const query = new URL(request.url).searchParams.get('query') || ''
    const filtered = fallbackSuggestions.filter(name =>
      name.toLowerCase().includes(query.toLowerCase())
    )

    return Response.json({ suggestions: filtered.slice(0, 5) })
  }
}
