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
    const audioFile = formData.get('audio') as Blob

    if (!audioFile) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 })
    }

    console.log('Audio blob size:', audioFile.size, 'type:', audioFile.type)

    if (audioFile.size < 100) {
      return Response.json({ 
        error: 'Audio file too small',
        transcription: 'nothing' 
      }, { status: 400 })
    }

    // Convert to proper format for Whisper
    const file = new File([audioFile], 'audio.webm', { 
      type: 'audio/webm'
    })

    console.log('Sending to Whisper...')

    // Step 1: Transcribe audio using Whisper
    let transcription
    try {
      transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'en'
      })
    } catch (e: any) {
      console.error('Whisper error:', e)
      return Response.json({ 
        error: 'Transcription failed: ' + e.message,
        transcription: 'error'
      }, { status: 500 })
    }

    const text = transcription.text
    console.log('Transcription:', text)

    if (!text || text.trim().length === 0) {
      return Response.json({ 
        error: 'No speech detected',
        transcription: 'nothing' 
      }, { status: 400 })
    }

    // Step 2: Use GPT-4 to extract food info
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a nutrition expert. The user will describe all the food they ate.

Your job:
1. Create a descriptive name that includes ALL foods mentioned (e.g., "2 Eggs, 40g Egg Whites, and Bagel")
2. Calculate the TOTAL calories for ALL foods combined
3. Calculate the TOTAL protein for ALL foods combined

Return ONLY valid JSON:
{"name": "descriptive name with all foods", "calories": total_number, "protein": total_number}

Examples:
- Input: "I had 2 eggs, 40g of egg whites, and a bagel"
  Output: {"name": "2 Eggs, 40g Egg Whites, and Bagel", "calories": 465, "protein": 35}

- Input: "chicken breast and rice"
  Output: {"name": "Chicken Breast and Rice", "calories": 350, "protein": 45}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })

    const response = completion.choices[0].message.content || '{}'
    console.log('GPT response:', response)
    
    let foodData
    try {
      foodData = JSON.parse(response)
    } catch (e) {
      console.error('Parse error:', e)
      return Response.json({ 
        error: 'Failed to parse response',
        transcription: text 
      }, { status: 500 })
    }

    if (!foodData.name || !foodData.calories || !foodData.protein) {
      return Response.json({ 
        error: 'Could not extract food data',
        transcription: text 
      }, { status: 400 })
    }

    return Response.json({ 
      food: foodData,
      transcription: text 
    })
  } catch (e: any) {
    console.error('Voice log error:', e)
    return Response.json({ 
      error: e.message || String(e),
      transcription: 'error'
    }, { status: 500 })
  }
}