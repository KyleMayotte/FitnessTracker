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
    const { currentWeight, targetWeight, weightGoalType, weeklyWorkouts } = body

    if (!currentWeight || !targetWeight || !weightGoalType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const weightDifference = Math.abs(parseFloat(targetWeight) - parseFloat(currentWeight))

    const prompt = `You are a professional nutritionist and fitness coach. Based on these details, provide personalized recommendations:

Current Weight: ${currentWeight} lbs
Target Weight: ${targetWeight} lbs
Goal Type: ${weightGoalType === 'lose' ? 'Lose Weight' : weightGoalType === 'gain' ? 'Gain Weight' : 'Maintain Weight'}
Weight Difference: ${weightDifference} lbs
Weekly Workouts: ${weeklyWorkouts || 'Not specified'}

Please provide:
1. Recommended daily calorie intake (considering ${weightGoalType === 'lose' ? 'a moderate calorie deficit' : weightGoalType === 'gain' ? 'a moderate calorie surplus' : 'maintenance calories'})
2. Recommended daily protein intake in grams (for muscle preservation/building)
3. A realistic deadline to achieve this goal (in weeks or months)
4. Brief reasoning for each recommendation

Consider:
- Safe weight loss is 1-2 lbs per week
- Safe weight gain is 0.5-1 lb per week
- Protein should be around 0.8-1g per pound of body weight
- Calorie recommendations should be sustainable and healthy

Respond in this JSON format only:
{
  "dailyCalories": 2000,
  "dailyProtein": 150,
  "deadline": "2024-12-31",
  "reasoning": "Your brief explanation here focusing on why these numbers are optimal"
}

Return ONLY the JSON, no other text.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist and fitness coach. Always respond with valid JSON only."
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
    let recommendations
    try {
      recommendations = JSON.parse(response || '{}')
    } catch (e) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = response?.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    return Response.json({ recommendations })
  } catch (e) {
    console.error('AI Recommendation Error:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
