import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const barcode = searchParams.get('barcode')

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode is required' }, { status: 400 })
  }

  try {
    // Query Open Food Facts API
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
    const data = await response.json()

    if (data.status === 0 || !data.product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = data.product

    // Extract nutritional information per 100g
    const nutriments = product.nutriments || {}

    // Calculate per serving if available, otherwise use per 100g
    let calories = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0
    let protein = nutriments['proteins_100g'] || nutriments['proteins'] || 0

    // If serving size is available, calculate per serving
    if (product.serving_size) {
      const servingCalories = nutriments['energy-kcal_serving']
      const servingProtein = nutriments['proteins_serving']

      if (servingCalories) calories = servingCalories
      if (servingProtein) protein = servingProtein
    }

    const foodData = {
      name: product.product_name || 'Unknown Product',
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10, // Round to 1 decimal
      brand: product.brands || '',
      servingSize: product.serving_size || '100g',
      imageUrl: product.image_url || null
    }

    return NextResponse.json({ food: foodData })
  } catch (error) {
    console.error('Barcode lookup error:', error)
    return NextResponse.json({ error: 'Failed to lookup barcode' }, { status: 500 })
  }
}
