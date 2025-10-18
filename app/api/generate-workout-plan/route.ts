import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goal, experience, daysPerWeek, equipment, limitations, preferences } = body

    const prompt = `You are a professional fitness coach. Create a detailed ${daysPerWeek}-day per week workout plan based on these details:

Goal: ${goal}
Experience Level: ${experience}
Days Available: ${daysPerWeek} days per week
Equipment: ${equipment}
Limitations/Injuries: ${limitations || 'None'}
Preferences: ${preferences || 'None'}

Generate a complete workout plan with ${daysPerWeek} different workout templates. For each workout:
1. Give it a descriptive name (e.g., "Push Day", "Leg Day", "Upper Body Strength")
2. List 4-6 exercises appropriate for the goal and experience level
3. For each exercise, specify the number of sets and reps based on the goal:
   - For muscle building: 3-4 sets of 8-12 reps
   - For strength: 4-5 sets of 4-6 reps
   - For endurance: 2-3 sets of 12-20 reps
   - Adjust based on experience level (beginners do fewer sets)
4. Only include exercises that can be done with the available equipment
5. Avoid exercises that might aggravate any mentioned limitations

Format your response as a JSON array like this:
[
  {
    "name": "Workout Name",
    "exercises": [
      {
        "name": "Exercise 1",
        "sets": 3,
        "reps": "10-12"
      },
      {
        "name": "Exercise 2",
        "sets": 4,
        "reps": "8-10"
      }
    ]
  }
]

Return ONLY the JSON array, no other text.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional fitness coach who creates personalized workout plans. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    })

    const response = completion.choices[0].message.content
    
    // Parse the JSON response
    let workoutPlan
    try {
      workoutPlan = JSON.parse(response || '[]')
    } catch (e) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = response?.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        workoutPlan = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    return Response.json({ workoutPlan })
  } catch (e) {
    console.error('AI Generation Error:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}