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

    const formData = await request.formData()
    const imageFile = formData.get('image') as Blob

    if (!imageFile) {
      return Response.json({ error: 'No image provided' }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mimeType = imageFile.type || 'image/jpeg'

    console.log('Analyzing meal image with GPT-4 Vision...')

    // Use GPT-4 Vision to analyze the meal
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a nutrition expert analyzing a meal photo. Your task is to:

1. IDENTIFY all visible foods and estimate their portions/quantities
2. CREATE a descriptive name that lists ALL foods with quantities (e.g., "2 Scrambled Eggs, 2 Slices Toast, and Coffee")
3. CALCULATE total calories for the ENTIRE meal shown
4. CALCULATE total protein (in grams) for the ENTIRE meal shown

GUIDELINES:
- Be specific: Include portion sizes/counts when visible (e.g., "1 cup rice" not just "rice")
- Be comprehensive: List ALL foods you can identify in the image
- Be accurate: Use standard serving sizes and nutrition databases in your estimates
- Consider preparation methods: Fried, grilled, baked foods have different calories
- Account for visible oils, sauces, or toppings
- If multiple items, sum the total nutrition for everything visible

EXAMPLES:
- Image shows 2 fried eggs + 2 toast slices + butter
  Output: {"name": "2 Fried Eggs, 2 Slices Buttered Toast", "calories": 420, "protein": 18}

- Image shows chicken breast + rice + broccoli
  Output: {"name": "Grilled Chicken Breast (6oz), 1 Cup White Rice, Steamed Broccoli", "calories": 580, "protein": 52}

Return ONLY valid JSON in this exact format:
{"name": "descriptive meal name with all foods and portions", "calories": total_number, "protein": total_number}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: "json_object" }
    })

    const response = completion.choices[0].message.content || '{}'
    console.log('Vision API response:', response)
    
    let foodData
    try {
      foodData = JSON.parse(response)
    } catch (e) {
      console.error('Parse error:', e)
      return Response.json({ error: 'Failed to parse response' }, { status: 500 })
    }

    if (!foodData.name || !foodData.calories || !foodData.protein) {
      return Response.json({ error: 'Could not analyze meal' }, { status: 400 })
    }

    return Response.json({ food: foodData })
  } catch (e: any) {
    console.error('Meal vision error:', e)
    return Response.json({ error: e.message || String(e) }, { status: 500 })
  }
}