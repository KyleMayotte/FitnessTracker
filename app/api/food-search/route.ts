import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query) {
      return Response.json({ error: 'Query required' }, { status: 400 })
    }

    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=DEMO_KEY`
    )

    const data = await response.json()

    const foods = data.foods?.map((food: any) => {
      const calories = food.foodNutrients?.find((n: any) => n.nutrientName === 'Energy')?.value || 0
      const protein = food.foodNutrients?.find((n: any) => n.nutrientName === 'Protein')?.value || 0

      return {
        name: food.description,
        calories: Math.round(calories),
        protein: Math.round(protein)
      }
    }) || []

    return Response.json({ foods })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}