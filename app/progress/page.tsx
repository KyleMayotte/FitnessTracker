'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface WeightEntry {
  _id?: string
  date: string
  weight: number
}

interface DailyActivity {
  date: string
  workouts: any[]
  nutrition: {
    calories: number
    caloriesGoal: number
    protein: number
    proteinGoal: number
  }
  weight?: number
}

export default function ProgressPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [sessions, setSessions] = useState([])
  const [foodLogs, setFoodLogs] = useState([])
  const [goals, setGoals] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAllData()
    }
  }, [status])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchWeightEntries(),
      fetchSessions(),
      fetchFoodLogs(),
      fetchGoals()
    ])
    setLoading(false)
  }

  const fetchWeightEntries = async () => {
    try {
      const response = await fetch('/api/weight')
      const data = await response.json()
      setWeightEntries(data.weights || [])
    } catch (e) {
      console.error('Error fetching weight entries:', e)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (e) {
      console.error('Error fetching sessions:', e)
    }
  }

  const fetchFoodLogs = async () => {
    try {
      const response = await fetch('/api/food')
      const data = await response.json()
      setFoodLogs(data.foods || [])
    } catch (e) {
      console.error('Error fetching food logs:', e)
    }
  }

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goals')
      const data = await response.json()
      setGoals(data.goals)
    } catch (e) {
      console.error('Error fetching goals:', e)
    }
  }

  const addWeightEntry = async () => {
    const weight = parseFloat(newWeight)
    if (!weight || weight <= 0) {
      alert('Please enter a valid weight')
      return
    }

    try {
      await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight, date: new Date().toISOString() })
      })
      setNewWeight('')
      await fetchWeightEntries()
    } catch (e) {
      alert('Error saving weight: ' + String(e))
    }
  }

  const groupActivitiesByDate = (): DailyActivity[] => {
    const activityMap = new Map<string, DailyActivity>()

    // Add weight entries
    weightEntries.forEach(entry => {
      const dateKey = new Date(entry.date).toLocaleDateString()
      if (!activityMap.has(dateKey)) {
        activityMap.set(dateKey, {
          date: entry.date,
          workouts: [],
          nutrition: { calories: 0, caloriesGoal: goals?.dailyCalories || 0, protein: 0, proteinGoal: goals?.dailyProtein || 0 },
          weight: entry.weight
        })
      } else {
        activityMap.get(dateKey)!.weight = entry.weight
      }
    })

    // Add workout sessions
    sessions.forEach((session: any) => {
      const dateKey = new Date(session.date).toLocaleDateString()
      if (!activityMap.has(dateKey)) {
        activityMap.set(dateKey, {
          date: session.date,
          workouts: [session],
          nutrition: { calories: 0, caloriesGoal: goals?.dailyCalories || 0, protein: 0, proteinGoal: goals?.dailyProtein || 0 }
        })
      } else {
        activityMap.get(dateKey)!.workouts.push(session)
      }
    })

    // Add food logs
    foodLogs.forEach((food: any) => {
      const dateKey = new Date(food.date).toLocaleDateString()
      if (!activityMap.has(dateKey)) {
        activityMap.set(dateKey, {
          date: food.date,
          workouts: [],
          nutrition: {
            calories: food.calories || 0,
            caloriesGoal: goals?.dailyCalories || 0,
            protein: food.protein || 0,
            proteinGoal: goals?.dailyProtein || 0
          }
        })
      } else {
        const activity = activityMap.get(dateKey)!
        activity.nutrition.calories += food.calories || 0
        activity.nutrition.protein += food.protein || 0
      }
    })

    // Convert to array and sort by date (newest first)
    return Array.from(activityMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return null
  }

  const dailyActivities = groupActivitiesByDate()
  const sortedWeights = [...weightEntries].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Calculate weight stats
  const currentWeight = sortedWeights[0]?.weight
  const startWeight = sortedWeights[sortedWeights.length - 1]?.weight
  const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">
            Progress Tracker
          </h1>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back to Home
          </button>
        </div>

        {/* Weight Graph */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Weight Progress</h2>

          {weightEntries.length > 0 ? (
            <div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Current Weight</p>
                  <p className="text-2xl font-bold text-blue-600">{currentWeight} lbs</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Starting Weight</p>
                  <p className="text-2xl font-bold text-purple-600">{startWeight} lbs</p>
                </div>
                <div className={`p-4 rounded-lg ${weightChange < 0 ? 'bg-green-50' : weightChange > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  <p className="text-sm text-gray-600">Total Change</p>
                  <p className={`text-2xl font-bold ${weightChange < 0 ? 'text-green-600' : weightChange > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} lbs
                  </p>
                </div>
              </div>

              {/* Simple Graph */}
              <div className="relative h-64 border-l-2 border-b-2 border-gray-300 mb-4">
                <div className="absolute left-0 top-0 bottom-0 w-full pl-12 pr-4 pb-8">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-600">
                    {Array.from({ length: 5 }, (_, i) => {
                      const maxWeight = Math.max(...weightEntries.map(w => w.weight))
                      const minWeight = Math.min(...weightEntries.map(w => w.weight))
                      const range = maxWeight - minWeight
                      const value = maxWeight - (range * i / 4)
                      return (
                        <span key={i} className="text-right pr-2">
                          {value.toFixed(0)}
                        </span>
                      )
                    })}
                  </div>

                  {/* Graph area */}
                  <div className="h-full ml-10 relative">
                    {/* Grid lines */}
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-t border-gray-200"
                        style={{ top: `${(i * 25)}%` }}
                      />
                    ))}

                    {/* Data points and line */}
                    <svg className="absolute inset-0 w-full h-full">
                      {sortedWeights.slice().reverse().map((entry, index, arr) => {
                        const maxWeight = Math.max(...weightEntries.map(w => w.weight))
                        const minWeight = Math.min(...weightEntries.map(w => w.weight))
                        const range = maxWeight - minWeight || 1
                        const x = (index / (arr.length - 1)) * 100
                        const y = 100 - ((entry.weight - minWeight) / range) * 100

                        const nextEntry = arr[index + 1]
                        if (nextEntry) {
                          const nextX = ((index + 1) / (arr.length - 1)) * 100
                          const nextY = 100 - ((nextEntry.weight - minWeight) / range) * 100
                          return (
                            <g key={entry._id || index}>
                              <line
                                x1={`${x}%`}
                                y1={`${y}%`}
                                x2={`${nextX}%`}
                                y2={`${nextY}%`}
                                stroke="#3B82F6"
                                strokeWidth="3"
                              />
                              <circle
                                cx={`${x}%`}
                                cy={`${y}%`}
                                r="5"
                                fill="#3B82F6"
                                className="hover:r-7 cursor-pointer"
                              >
                                <title>{entry.weight} lbs - {new Date(entry.date).toLocaleDateString()}</title>
                              </circle>
                            </g>
                          )
                        }
                        return (
                          <circle
                            key={entry._id || index}
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="5"
                            fill="#3B82F6"
                            className="hover:r-7 cursor-pointer"
                          >
                            <title>{entry.weight} lbs - {new Date(entry.date).toLocaleDateString()}</title>
                          </circle>
                        )
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No weight entries yet. Add your first weight below!</p>
            </div>
          )}
        </div>

        {/* Add Weight Entry */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg shadow mb-6 border-2 border-green-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Log Today's Weight</h3>
          <div className="flex gap-3">
            <input
              type="number"
              step="0.1"
              placeholder="Enter weight (lbs)"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWeightEntry()}
              className="flex-1 p-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-green-500 focus:outline-none"
            />
            <button
              onClick={addWeightEntry}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold"
            >
              Add Weight
            </button>
          </div>
        </div>

        {/* Daily Activity Timeline */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Activity Timeline</h2>

          {dailyActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No activity logged yet</p>
          ) : (
            <div className="space-y-4">
              {dailyActivities.map((activity, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-6 py-4 bg-gray-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {new Date(activity.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h3>
                    </div>
                    {activity.weight && (
                      <div className="bg-blue-100 px-3 py-1 rounded-full">
                        <span className="text-sm font-semibold text-blue-700">
                          Weight: {activity.weight} lbs
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Workouts */}
                    {activity.workouts.map((workout, wIndex) => (
                      <div key={wIndex} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">💪</span>
                          <div>
                            <p className="font-bold text-gray-900">{workout.templateName}</p>
                            <p className="text-sm text-gray-600">
                              {workout.exercises.length} exercises • {new Date(workout.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Nutrition */}
                    {(activity.nutrition.calories > 0 || activity.nutrition.protein > 0) && (
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🍽️</span>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">Nutrition</p>
                            <div className="flex gap-4 text-sm">
                              <span className={`font-semibold ${
                                activity.nutrition.calories >= activity.nutrition.caloriesGoal
                                  ? 'text-green-600'
                                  : 'text-orange-600'
                              }`}>
                                {Math.round(activity.nutrition.calories)}/{activity.nutrition.caloriesGoal} calories
                              </span>
                              <span className={`font-semibold ${
                                activity.nutrition.protein >= activity.nutrition.proteinGoal
                                  ? 'text-green-600'
                                  : 'text-orange-600'
                              }`}>
                                {Math.round(activity.nutrition.protein)}/{activity.nutrition.proteinGoal}g protein
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {activity.workouts.length === 0 && activity.nutrition.calories === 0 && !activity.weight && (
                      <p className="text-gray-500 text-sm italic">No activity recorded</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
