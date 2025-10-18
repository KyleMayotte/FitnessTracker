'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function GoalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dailyCalories, setDailyCalories] = useState('')
  const [dailyProtein, setDailyProtein] = useState('')
  const [weeklyWorkouts, setWeeklyWorkouts] = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [weightGoalType, setWeightGoalType] = useState('maintain')
  const [deadline, setDeadline] = useState('')
  const [saved, setSaved] = useState(false)
  const [recommending, setRecommending] = useState(false)
  const [aiReasoning, setAiReasoning] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchGoals()
    }
  }, [status])

  const fetchGoals = async () => {
    const response = await fetch('/api/goals')
    const data = await response.json()
    if (data.goals) {
      setDailyCalories(data.goals.dailyCalories || '')
      setDailyProtein(data.goals.dailyProtein || '')
      setWeeklyWorkouts(data.goals.weeklyWorkouts || '')
      setCurrentWeight(data.goals.currentWeight || '')
      setTargetWeight(data.goals.targetWeight || '')
      setWeightGoalType(data.goals.weightGoalType || 'maintain')
      setDeadline(data.goals.deadline || '')
    }
  }

  const getAIRecommendations = async () => {
    if (!currentWeight || !targetWeight) {
      alert('Please enter your current weight and target weight first')
      return
    }

    setRecommending(true)
    setAiReasoning('')

    try {
      const response = await fetch('/api/recommend-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentWeight,
          targetWeight,
          weightGoalType,
          weeklyWorkouts
        })
      })

      const data = await response.json()

      if (data.recommendations) {
        setDailyCalories(data.recommendations.dailyCalories.toString())
        setDailyProtein(data.recommendations.dailyProtein.toString())
        setDeadline(data.recommendations.deadline)
        setAiReasoning(data.recommendations.reasoning)
      } else {
        alert('Failed to get recommendations. Please try again.')
      }
    } catch (e) {
      alert('Error getting recommendations: ' + String(e))
    }

    setRecommending(false)
  }

  const saveGoals = async () => {
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyCalories: dailyCalories,
        dailyProtein: dailyProtein,
        weeklyWorkouts: weeklyWorkouts,
        currentWeight: currentWeight,
        targetWeight: targetWeight,
        weightGoalType: weightGoalType,
        deadline: deadline
      })
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-purple-600">
            My Goals
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
                href="/food"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
              >
                Food
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
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Set Your Goals</h2>
          
          {saved && (
            <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
              Goals saved successfully!
            </div>
          )}

          <div className="space-y-6">
            {/* Weight Goals Section */}
            <div className="border-b pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Weight Goals</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-900 font-semibold mb-2">
                    Weight Goal Type
                  </label>
                  <select
                    value={weightGoalType}
                    onChange={(e) => setWeightGoalType(e.target.value)}
                    className="w-full p-3 border rounded text-gray-900"
                  >
                    <option value="lose">Lose Weight</option>
                    <option value="gain">Gain Weight</option>
                    <option value="maintain">Maintain Weight</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-900 font-semibold mb-2">
                      Current Weight (lbs)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 180"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      className="w-full p-3 border rounded text-gray-900"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-900 font-semibold mb-2">
                      Target Weight (lbs)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 170"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(e.target.value)}
                      className="w-full p-3 border rounded text-gray-900"
                      step="0.1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold mb-2">
                    Goal Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-3 border rounded text-gray-900"
                  />
                </div>

                {currentWeight && targetWeight && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Goal: {weightGoalType === 'lose' ? 'Lose' : weightGoalType === 'gain' ? 'Gain' : 'Maintain'} {Math.abs(parseFloat(targetWeight) - parseFloat(currentWeight)).toFixed(1)} lbs
                    </p>
                    {weightGoalType !== 'maintain' && (
                      <p className="text-xs text-blue-700 mt-1">
                        Progress: {currentWeight} lbs → {targetWeight} lbs
                      </p>
                    )}
                  </div>
                )}

                {currentWeight && targetWeight && (
                  <button
                    onClick={getAIRecommendations}
                    disabled={recommending}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded hover:from-purple-700 hover:to-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {recommending ? '✨ Getting AI Recommendations...' : '✨ Get AI Recommendations'}
                  </button>
                )}

                {aiReasoning && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-4">
                    <p className="text-xs font-semibold text-purple-900 mb-1">AI Recommendation:</p>
                    <p className="text-sm text-purple-800">{aiReasoning}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Nutrition Goals Section */}
            <div className="border-b pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Nutrition Goals</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-900 font-semibold mb-2">
                    Daily Calorie Goal (optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 2000"
                    value={dailyCalories}
                    onChange={(e) => setDailyCalories(e.target.value)}
                    className="w-full p-3 border rounded text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold mb-2">
                    Daily Protein Goal (grams)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 150"
                    value={dailyProtein}
                    onChange={(e) => setDailyProtein(e.target.value)}
                    className="w-full p-3 border rounded text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Workout Goals Section */}
            <div className="pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Workout Goals</h3>

              <div>
                <label className="block text-gray-900 font-semibold mb-2">
                  Weekly Workout Goal
                </label>
                <input
                  type="number"
                  placeholder="e.g., 5"
                  value={weeklyWorkouts}
                  onChange={(e) => setWeeklyWorkouts(e.target.value)}
                  className="w-full p-3 border rounded text-gray-900"
                />
              </div>
            </div>

            <button
              onClick={saveGoals}
              className="w-full bg-purple-600 text-white px-6 py-4 rounded hover:bg-purple-700 font-bold text-lg"
            >
              Save All Goals
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}