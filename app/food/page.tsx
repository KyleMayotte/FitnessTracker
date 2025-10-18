'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function FoodPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [foods, setFoods] = useState([])
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [goals, setGoals] = useState<any>(null)
  const [todayCalories, setTodayCalories] = useState(0)
  const [todayProtein, setTodayProtein] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [activeAddMeal, setActiveAddMeal] = useState<string | null>(null)
  const [savedMeals, setSavedMeals] = useState([])
  const [showSaveMeal, setShowSaveMeal] = useState<string | null>(null)
  const [saveMealName, setSaveMealName] = useState('')
  const [showSavedMeals, setShowSavedMeals] = useState(false)
  const [addingSavedMealTo, setAddingSavedMealTo] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [scanningBarcode, setScanningBarcode] = useState(false)
  const barcodeVideoRef = useRef<HTMLVideoElement>(null)
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null)
  const [creatingCustomMeal, setCreatingCustomMeal] = useState(false)
  const [customMealName, setCustomMealName] = useState('')
  const [customMealFoods, setCustomMealFoods] = useState<Array<{name: string, calories: string, protein: string}>>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchGoals = async () => {
    const response = await fetch('/api/goals')
    const data = await response.json()
    setGoals(data.goals)
  }

  const fetchFoods = async () => {
    const response = await fetch('/api/food')
    const data = await response.json()
    setFoods(data.foods || [])
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayFoods = (data.foods || []).filter((f: any) => {
      const foodDate = new Date(f.date)
      foodDate.setHours(0, 0, 0, 0)
      return foodDate.getTime() === today.getTime()
    })
    
    const totalCals = todayFoods.reduce((sum: number, f: any) => sum + (parseInt(f.calories) || 0), 0)
    const totalProtein = todayFoods.reduce((sum: number, f: any) => sum + (parseInt(f.protein) || 0), 0)
    
    setTodayCalories(totalCals)
    setTodayProtein(totalProtein)
  }

  const fetchSavedMeals = async () => {
    const response = await fetch('/api/saved-meals')
    const data = await response.json()
    setSavedMeals(data.savedMeals || [])
  }

  const searchFood = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    const response = await fetch(`/api/food-search?query=${encodeURIComponent(searchQuery)}`)
    const data = await response.json()
    setSearchResults(data.foods || [])
    setSearching(false)
  }

  const selectFood = (food: any) => {
    setFoodName(food.name)
    setCalories(food.calories.toString())
    setProtein(food.protein.toString())
    setSearchQuery('')
    setSearchResults([])
  }

  const saveFood = async (mealType: string) => {
    if (!foodName || !calories || !protein) {
      alert('Please fill in all fields')
      return
    }

    await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: foodName,
        calories: calories,
        protein: protein,
        mealType: mealType
      })
    })
    setFoodName('')
    setCalories('')
    setProtein('')
    setSearchQuery('')
    setSearchResults([])
    setActiveAddMeal(null)
    setAddingSavedMealTo(null)
    fetchFoods()
  }

  const deleteFood = async (foodId: string) => {
    if (!confirm('Are you sure you want to delete this food?')) {
      return
    }

    await fetch(`/api/food?id=${foodId}`, {
      method: 'DELETE'
    })

    fetchFoods()
  }

  const saveMealTemplate = async (mealType: string) => {
    const mealFoods = getFoodsByMeal(mealType)
    
    if (mealFoods.length === 0) {
      alert('No foods to save in this meal')
      return
    }

    if (!saveMealName.trim()) {
      alert('Please enter a name for this meal')
      return
    }

    const totalCals = mealFoods.reduce((sum: number, f: any) => sum + (parseInt(f.calories) || 0), 0)
    const totalProt = mealFoods.reduce((sum: number, f: any) => sum + (parseInt(f.protein) || 0), 0)

    await fetch('/api/saved-meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: saveMealName,
        foods: mealFoods.map((f: any) => ({
          name: f.name,
          calories: f.calories,
          protein: f.protein
        })),
        totalCalories: totalCals,
        totalProtein: totalProt
      })
    })

    setSaveMealName('')
    setShowSaveMeal(null)
    fetchSavedMeals()
    alert('Meal saved!')
  }

  const addSavedMeal = async (savedMeal: any, mealType: string) => {
    for (const food of savedMeal.foods) {
      await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          mealType: mealType
        })
      })
    }

    setAddingSavedMealTo(null)
    setActiveAddMeal(null)
    fetchFoods()
  }

  const deleteSavedMeal = async (mealId: string) => {
    if (!confirm('Delete this saved meal?')) {
      return
    }

    await fetch(`/api/saved-meals?id=${mealId}`, {
      method: 'DELETE'
    })

    fetchSavedMeals()
  }

  const addFoodToCustomMeal = () => {
    if (!foodName || !calories || !protein) {
      alert('Please fill in all food fields')
      return
    }

    setCustomMealFoods([
      ...customMealFoods,
      { name: foodName, calories, protein }
    ])

    // Clear food inputs
    setFoodName('')
    setCalories('')
    setProtein('')
  }

  const removeFoodFromCustomMeal = (index: number) => {
    setCustomMealFoods(customMealFoods.filter((_, i) => i !== index))
  }

  const saveCustomMeal = async () => {
    if (!customMealName.trim()) {
      alert('Please enter a name for this meal')
      return
    }

    if (customMealFoods.length === 0) {
      alert('Please add at least one food to the meal')
      return
    }

    const totalCals = customMealFoods.reduce((sum, f) => sum + (parseInt(f.calories) || 0), 0)
    const totalProt = customMealFoods.reduce((sum, f) => sum + (parseInt(f.protein) || 0), 0)

    await fetch('/api/saved-meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customMealName,
        foods: customMealFoods.map(f => ({
          name: f.name,
          calories: parseInt(f.calories),
          protein: parseInt(f.protein)
        })),
        totalCalories: totalCals,
        totalProtein: totalProt
      })
    })

    // Reset state
    setCustomMealName('')
    setCustomMealFoods([])
    setCreatingCustomMeal(false)
    setFoodName('')
    setCalories('')
    setProtein('')
    fetchSavedMeals()
    alert('Custom meal saved!')
  }

  const cancelCustomMeal = () => {
    setCreatingCustomMeal(false)
    setCustomMealName('')
    setCustomMealFoods([])
    setFoodName('')
    setCalories('')
    setProtein('')
  }

  const getFoodsByMeal = (meal: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return foods.filter((f: any) => {
      const foodDate = new Date(f.date)
      foodDate.setHours(0, 0, 0, 0)
      return foodDate.getTime() === today.getTime() && f.mealType === meal
    })
  }

  const getMealTotals = (meal: string) => {
    const mealFoods = getFoodsByMeal(meal)
    const cals = mealFoods.reduce((sum: number, f: any) => sum + (parseInt(f.calories) || 0), 0)
    const prot = mealFoods.reduce((sum: number, f: any) => sum + (parseInt(f.protein) || 0), 0)
    return { calories: cals, protein: prot }
  }

  const cancelAdd = () => {
    setActiveAddMeal(null)
    setFoodName('')
    setCalories('')
    setProtein('')
    setSearchQuery('')
    setSearchResults([])
    setAddingSavedMealTo(null)
  }

  const startVoiceLog = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      const audioChunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

        // Check if we got any audio data
        if (audioBlob.size > 0) {
          await processVoiceLog(audioBlob)
        } else {
          alert('No audio recorded. Please try again and speak clearly.')
        }

        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)

      // Auto-stop after 10 seconds max
      setTimeout(() => {
        if (recorder.state === 'recording') {
          alert('Recording stopped automatically after 10 seconds')
          stopVoiceLog()
        }
      }, 10000)
    } catch (e) {
      alert('Microphone access denied. Please allow microphone access.')
    }
  }

  const stopVoiceLog = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const processVoiceLog = async (audioBlob: Blob) => {
    setSearching(true)

    const formData = new FormData()
    formData.append('audio', audioBlob)

    try {
      const response = await fetch('/api/voice-food-log', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.food) {
        setFoodName(data.food.name)
        setCalories(data.food.calories.toString())
        setProtein(data.food.protein.toString())
        alert(`Heard: "${data.transcription}"\n\nFood logged! Review and save.`)
      } else {
        alert(`Heard: "${data.transcription || 'nothing'}"\n\nCould not understand the food. Try saying something like "I ate two eggs and toast"`)
      }
    } catch (e) {
      alert('Error processing voice: ' + String(e))
    }

    setSearching(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraStream(stream)
        setShowCamera(true)
      }
    } catch (e) {
      alert('Camera access denied. Please allow camera access.')
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'meal.jpg', { type: 'image/jpeg' })
            analyzeMealImage(file)
            stopCamera()
          }
        }, 'image/jpeg', 0.95)
      }
    }
  }

  const analyzeMealImage = async (imageFile: File) => {
    setAnalyzingImage(true)

    const formData = new FormData()
    formData.append('image', imageFile)

    try {
      const response = await fetch('/api/meal-vision', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.food) {
        setFoodName(data.food.name)
        setCalories(data.food.calories.toString())
        setProtein(data.food.protein.toString())
        alert(`AI detected: ${data.food.name}\n\nReview and save!`)
      } else {
        alert('Could not analyze the image. Please try again.')
      }
    } catch (e) {
      alert('Error analyzing image: ' + String(e))
    }

    setAnalyzingImage(false)
  }

  const startBarcodeScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      if (barcodeVideoRef.current) {
        barcodeVideoRef.current.srcObject = stream
        setShowBarcodeScanner(true)
        setScanningBarcode(true)

        // Start scanning for barcodes
        scanBarcode()
      }
    } catch (e) {
      alert('Camera access denied. Please allow camera access.')
    }
  }

  const stopBarcodeScanner = () => {
    setScanningBarcode(false)
    setShowBarcodeScanner(false)

    if (barcodeVideoRef.current && barcodeVideoRef.current.srcObject) {
      const stream = barcodeVideoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      barcodeVideoRef.current.srcObject = null
    }
  }

  const scanBarcode = async () => {
    if (!barcodeVideoRef.current || !barcodeCanvasRef.current || !scanningBarcode) return

    const video = barcodeVideoRef.current
    const canvas = barcodeCanvasRef.current

    // Wait for video to be ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setTimeout(scanBarcode, 100)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Import ZXing library dynamically
    try {
      const ZXing = await import('@zxing/library')
      const codeReader = new ZXing.BrowserMultiFormatReader()

      try {
        // Convert canvas to data URL and create an image
        const dataUrl = canvas.toDataURL('image/png')
        const img = new Image()
        img.src = dataUrl

        await new Promise((resolve) => {
          img.onload = resolve
        })

        const result = await codeReader.decodeFromImageElement(img)

        if (result) {
          // Found a barcode!
          const barcode = result.getText()
          lookupBarcode(barcode)
          stopBarcodeScanner()
          return
        }
      } catch (e) {
        // No barcode found in this frame, keep scanning
      }

      // Keep scanning if still active
      if (scanningBarcode) {
        setTimeout(scanBarcode, 300)
      }
    } catch (e) {
      console.error('Error scanning barcode:', e)
      if (scanningBarcode) {
        setTimeout(scanBarcode, 300)
      }
    }
  }

  const lookupBarcode = async (barcode: string) => {
    setSearching(true)

    try {
      const response = await fetch(`/api/barcode-lookup?barcode=${encodeURIComponent(barcode)}`)
      const data = await response.json()

      if (data.food) {
        setFoodName(data.food.name)
        setCalories(data.food.calories.toString())
        setProtein(data.food.protein.toString())
        alert(`Found: ${data.food.name}\n${data.food.brand ? `Brand: ${data.food.brand}\n` : ''}Serving: ${data.food.servingSize}\n\nReview and save!`)
      } else {
        alert(`Barcode ${barcode} not found in database. Please enter manually.`)
      }
    } catch (e) {
      alert('Error looking up barcode: ' + String(e))
    }

    setSearching(false)
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchFoods()
      fetchGoals()
      fetchSavedMeals()
    }
  }, [status])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return null
  }

  const calorieProgress = goals?.dailyCalories 
    ? Math.min((todayCalories / goals.dailyCalories) * 100, 100)
    : 0

  const proteinProgress = goals?.dailyProtein 
    ? Math.min((todayProtein / goals.dailyProtein) * 100, 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-green-600">
            Food Tracker
          </h1>
          <div className="text-right">
            <p className="text-gray-700 mb-2">Welcome, {session.user?.name}!</p>
            <div className="space-x-2">
              <a 
                href="/"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block"
              >
                Workouts
              </a>
              <a 
                href="/goals"
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 inline-block"
              >
                Goals
              </a>
              <button
                onClick={() => signOut()}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {goals && (
          <div className="bg-white p-6 rounded-lg shadow mb-8 space-y-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Today's Progress</h3>
            
            {goals.dailyCalories && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-gray-900">Calories</span>
                  <span className="text-gray-700">{todayCalories} / {goals.dailyCalories} cal</span>
                </div>
                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-green-600 h-full transition-all duration-500 flex items-center justify-center text-white text-sm font-semibold"
                    style={{ width: `${calorieProgress}%` }}
                  >
                    {calorieProgress > 10 && `${Math.round(calorieProgress)}%`}
                  </div>
                </div>
              </div>
            )}

            {goals.dailyProtein && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-gray-900">Protein</span>
                  <span className="text-gray-700">{todayProtein}g / {goals.dailyProtein}g</span>
                </div>
                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-500 flex items-center justify-center text-white text-sm font-semibold"
                    style={{ width: `${proteinProgress}%` }}
                  >
                    {proteinProgress > 10 && `${Math.round(proteinProgress)}%`}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Saved Meals</h2>
            <button
              onClick={() => setShowSavedMeals(!showSavedMeals)}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              {showSavedMeals ? 'Hide' : 'Manage Saved Meals'}
            </button>
          </div>

          {showSavedMeals && (
            <div className="mt-4">
              {savedMeals.length === 0 ? (
                <p className="text-gray-500 mb-4">No saved meals yet. Add foods to a meal below, then click "Add Meal" here to save it!</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {savedMeals.map((meal: any) => (
                    <div key={meal._id} className="border rounded p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{meal.name}</h3>
                          <p className="text-sm text-gray-600">
                            {meal.totalCalories} cal • {meal.totalProtein}g protein
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {meal.foods.map((f: any) => f.name).join(', ')}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteSavedMeal(meal._id)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-bold text-gray-900 mb-3">Add New Saved Meal</h3>

                {/* Create Custom Meal Button */}
                {!creatingCustomMeal && (
                  <button
                    onClick={() => setCreatingCustomMeal(true)}
                    className="w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 mb-3"
                  >
                    + Create Custom Meal
                  </button>
                )}

                {/* Custom Meal Creation UI */}
                {creatingCustomMeal && (
                  <div className="mb-4 border rounded p-4 bg-blue-50">
                    <h4 className="font-bold text-gray-900 mb-3">Create Custom Meal</h4>

                    <input
                      type="text"
                      placeholder="Meal name (e.g., My Breakfast)"
                      value={customMealName}
                      onChange={(e) => setCustomMealName(e.target.value)}
                      className="w-full p-2 border rounded mb-3 text-gray-900"
                    />

                    {customMealFoods.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Foods in this meal:</p>
                        <div className="space-y-2">
                          {customMealFoods.map((food, index) => (
                            <div key={index} className="flex justify-between items-center bg-white p-2 rounded border">
                              <div>
                                <span className="font-semibold text-gray-900">{food.name}</span>
                                <span className="text-sm text-gray-600 ml-2">
                                  {food.calories} cal • {food.protein}g protein
                                </span>
                              </div>
                              <button
                                onClick={() => removeFoodFromCustomMeal(index)}
                                className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Add Food:</p>
                      <input
                        type="text"
                        placeholder="Food name"
                        value={foodName}
                        onChange={(e) => setFoodName(e.target.value)}
                        className="w-full p-2 border rounded mb-2 text-gray-900"
                      />
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          type="number"
                          placeholder="Calories"
                          value={calories}
                          onChange={(e) => setCalories(e.target.value)}
                          className="p-2 border rounded text-gray-900"
                        />
                        <input
                          type="number"
                          placeholder="Protein (g)"
                          value={protein}
                          onChange={(e) => setProtein(e.target.value)}
                          className="p-2 border rounded text-gray-900"
                        />
                      </div>
                      <button
                        onClick={addFoodToCustomMeal}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-3"
                      >
                        + Add Food to Meal
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={saveCustomMeal}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Save Meal
                      </button>
                      <button
                        onClick={cancelCustomMeal}
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Save from Current Meals */}
                {!creatingCustomMeal && (
                  <>
                    <p className="text-sm text-gray-600 mb-2">Or save from current meals:</p>
                    {['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => {
                      const mealFoods = getFoodsByMeal(meal)
                      if (mealFoods.length === 0) return null

                      return (
                        <div key={meal} className="mb-3">
                          {showSaveMeal === meal ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Name for this meal"
                                value={saveMealName}
                                onChange={(e) => setSaveMealName(e.target.value)}
                                className="flex-1 p-2 border rounded text-gray-900"
                              />
                              <button
                                onClick={() => saveMealTemplate(meal)}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setShowSaveMeal(null)
                                  setSaveMealName('')
                                }}
                                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowSaveMeal(meal)}
                              className="w-full bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 capitalize text-left"
                            >
                              + Add Meal from Current {meal} ({mealFoods.length} foods)
                            </button>
                          )}
                        </div>
                      )
                    })}
                    {['breakfast', 'lunch', 'dinner', 'snack'].every((meal) => getFoodsByMeal(meal).length === 0) && (
                      <p className="text-gray-500 text-sm">Add foods to any meal section below first!</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => {
            const mealFoods = getFoodsByMeal(meal)
            const totals = getMealTotals(meal)
            
            return (
              <div key={meal} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 capitalize">{meal}</h2>
                  <span className="text-sm text-gray-600">
                    {totals.calories} cal • {totals.protein}g protein
                  </span>
                </div>

                {mealFoods.length === 0 && activeAddMeal !== meal && (
                  <p className="text-gray-500 mb-4">No {meal} logged yet</p>
                )}

                {mealFoods.length > 0 && (
                  <ul className="space-y-3 mb-4">
                    {mealFoods.map((food: any) => (
                      <li key={food._id} className="bg-gray-50 p-4 rounded border">
                        <div className="flex justify-between items-center">
                          <div>
                            <strong className="text-lg text-gray-900">{food.name}</strong>
                            <p className="text-gray-700">{food.calories} cal • {food.protein}g protein</p>
                          </div>
                          <button
                            onClick={() => deleteFood(food._id)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {activeAddMeal === meal ? (
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      <button
                        onClick={isRecording ? stopVoiceLog : startVoiceLog}
                        className={`${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white px-3 py-3 rounded font-semibold text-sm`}
                      >
                        {isRecording ? '⏹ Stop' : '🎤 Voice'}
                      </button>
                      <button
                        onClick={startCamera}
                        disabled={analyzingImage}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-3 rounded font-semibold disabled:bg-gray-400 text-sm"
                      >
                        {analyzingImage ? '🔄 Analyzing' : '📷 Scan'}
                      </button>
                      <button
                        onClick={startBarcodeScanner}
                        disabled={scanningBarcode}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-3 rounded font-semibold disabled:bg-gray-400 text-sm"
                      >
                        {scanningBarcode ? '🔄 Scanning' : '📱 Barcode'}
                      </button>
                      <button
                        onClick={() => setAddingSavedMealTo(addingSavedMealTo === meal ? null : meal)}
                        className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-3 rounded font-semibold text-sm"
                      >
                        💾 Saved
                      </button>
                    </div>

                    {addingSavedMealTo === meal ? (
                      savedMeals.length > 0 ? (
                        <div className="mb-4 border rounded p-4 bg-gray-50">
                          <h3 className="font-bold text-gray-900 mb-2">Select Saved Meal</h3>
                          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                            {savedMeals.map((savedMeal: any) => (
                              <div
                                key={savedMeal._id}
                                onClick={() => addSavedMeal(savedMeal, meal)}
                                className="p-3 border rounded hover:bg-blue-50 cursor-pointer bg-white"
                              >
                                <div className="font-semibold text-gray-900">{savedMeal.name}</div>
                                <div className="text-sm text-gray-600">
                                  {savedMeal.totalCalories} cal • {savedMeal.totalProtein}g protein
                                </div>
                                <div className="text-xs text-gray-500">
                                  {savedMeal.foods.map((f: any) => f.name).join(', ')}
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => setAddingSavedMealTo(null)}
                            className="text-blue-600 underline text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="mb-4 border rounded p-4 bg-yellow-50 border-yellow-200">
                          <p className="text-gray-700 mb-2">No saved meals yet! Create saved meals by:</p>
                          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 mb-3">
                            <li>Add foods to any meal below</li>
                            <li>Click "Manage Saved Meals" at the top</li>
                            <li>Click "Add Meal from Current {meal}"</li>
                          </ol>
                          <button
                            onClick={() => setAddingSavedMealTo(null)}
                            className="text-blue-600 underline text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="mb-4">
                          <label className="block text-gray-900 font-semibold mb-2">Search USDA Database</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Search food (e.g., bagel, chicken breast)"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && searchFood()}
                              className="flex-1 p-2 border rounded text-gray-900"
                            />
                            <button
                              onClick={searchFood}
                              disabled={searching}
                              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                            >
                              {searching ? 'Searching...' : 'Search'}
                            </button>
                          </div>

                          {searchResults.length > 0 && (
                            <div className="mt-2 border rounded max-h-60 overflow-y-auto">
                              {searchResults.map((food, index) => (
                                <div
                                  key={index}
                                  onClick={() => selectFood(food)}
                                  className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                                >
                                  <div className="font-semibold text-gray-900">{food.name}</div>
                                  <div className="text-sm text-gray-600">
                                    {food.calories} cal • {food.protein}g protein
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="border-t pt-4">
                          <label className="block text-gray-900 font-semibold mb-2">Or Enter Manually</label>
                          <input
                            type="text"
                            placeholder="Food name (e.g., Chicken Breast)"
                            value={foodName}
                            onChange={(e) => setFoodName(e.target.value)}
                            className="w-full p-2 border rounded mb-4 text-gray-900"
                          />
                          <input
                            type="number"
                            placeholder="Calories (e.g., 165)"
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            className="w-full p-2 border rounded mb-4 text-gray-900"
                          />
                          <input
                            type="number"
                            placeholder="Protein in grams (e.g., 31)"
                            value={protein}
                            onChange={(e) => setProtein(e.target.value)}
                            className="w-full p-2 border rounded mb-4 text-gray-900"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveFood(meal)}
                              className="flex-1 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                            >
                              Save Food
                            </button>
                            <button
                              onClick={cancelAdd}
                              className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveAddMeal(meal)}
                    className="w-full bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                  >
                    + Add Food
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Camera Modal - Renders on top of everything */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg mb-4 bg-gray-800"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-4 justify-center">
              <button
                onClick={capturePhoto}
                className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 text-xl font-bold"
              >
                📸 Capture Photo
              </button>
              <button
                onClick={stopCamera}
                className="bg-red-600 text-white px-8 py-4 rounded-lg hover:bg-red-700 text-xl font-bold"
              >
                ✖ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal - Renders on top of everything */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <div className="text-center text-white mb-4">
              <h2 className="text-2xl font-bold mb-2">Scan Barcode</h2>
              <p className="text-sm opacity-75">Point camera at barcode</p>
            </div>
            <video
              ref={barcodeVideoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg mb-4 bg-gray-800"
            />
            <canvas ref={barcodeCanvasRef} className="hidden" />
            <div className="flex gap-4 justify-center">
              <button
                onClick={stopBarcodeScanner}
                className="bg-red-600 text-white px-8 py-4 rounded-lg hover:bg-red-700 text-xl font-bold"
              >
                ✖ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}