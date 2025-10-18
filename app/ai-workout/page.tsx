'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AIWorkoutPage() {
  const { status } = useSession()
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [goal, setGoal] = useState('')
  const [experience, setExperience] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState('3')
  const [equipment, setEquipment] = useState('')
  const [limitations, setLimitations] = useState('')
  const [preferences, setPreferences] = useState('')
  const [generatedPlan, setGeneratedPlan] = useState<any[]>([])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  const generatePlan = async () => {
    if (!goal || !experience || !equipment) {
      alert('Please fill in goal, experience level, and equipment')
      return
    }

    setGenerating(true)

    try {
      const response = await fetch('/api/generate-workout-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          experience,
          daysPerWeek,
          equipment,
          limitations,
          preferences
        })
      })

      const data = await response.json()
      
      if (data.workoutPlan) {
        setGeneratedPlan(data.workoutPlan)
      } else {
        alert('Failed to generate workout plan. Please try again.')
      }
    } catch (e) {
      alert('Error generating plan: ' + String(e))
    }

    setGenerating(false)
  }

  const saveWorkoutTemplate = async (workout: any) => {
    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workout.name,
          exercises: workout.exercises.map((exercise: any) => {
            // Handle both old format (string) and new format (object with sets/reps)
            if (typeof exercise === 'string') {
              return { name: exercise, sets: [] }
            } else {
              // Create pre-filled sets based on AI recommendation
              const sets = []
              for (let i = 0; i < exercise.sets; i++) {
                sets.push({
                  reps: exercise.reps.includes('-') ? exercise.reps.split('-')[0] : exercise.reps,
                  weight: ''
                })
              }
              return {
                name: exercise.name,
                sets: sets,
                recommendedSets: exercise.sets,
                recommendedReps: exercise.reps
              }
            }
          })
        })
      })
      alert(`"${workout.name}" saved to your workouts!`)
    } catch (e) {
      alert('Error saving workout: ' + String(e))
    }
  }

  const saveAllWorkouts = async () => {
    for (const workout of generatedPlan) {
      await saveWorkoutTemplate(workout)
    }
    alert('All workouts saved! Go to the main page to see them.')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">
            AI Workout Plan Generator
          </h1>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back to Home
          </button>
        </div>

        {generatedPlan.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Tell us about yourself</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-900 font-semibold mb-2">Fitness Goal *</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full p-3 border rounded text-gray-900"
                >
                  <option value="">Select your goal...</option>
                  <option value="Build Muscle">Build Muscle</option>
                  <option value="Lose Weight">Lose Weight</option>
                  <option value="Gain Strength">Gain Strength</option>
                  <option value="Improve Endurance">Improve Endurance</option>
                  <option value="General Fitness">General Fitness</option>
                  <option value="Athletic Performance">Athletic Performance</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-900 font-semibold mb-2">Experience Level *</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full p-3 border rounded text-gray-900"
                >
                  <option value="">Select experience...</option>
                  <option value="Beginner">Beginner (0-1 years)</option>
                  <option value="Intermediate">Intermediate (1-3 years)</option>
                  <option value="Advanced">Advanced (3+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-900 font-semibold mb-2">Days Per Week</label>
                <select
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(e.target.value)}
                  className="w-full p-3 border rounded text-gray-900"
                >
                  <option value="3">3 days</option>
                  <option value="4">4 days</option>
                  <option value="5">5 days</option>
                  <option value="6">6 days</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-900 font-semibold mb-2">Equipment Available *</label>
                <select
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="w-full p-3 border rounded text-gray-900"
                >
                  <option value="">Select equipment...</option>
                  <option value="Full Gym">Full Gym (barbells, dumbbells, machines)</option>
                  <option value="Home Gym">Home Gym (dumbbells, bench, basics)</option>
                  <option value="Dumbbells Only">Dumbbells Only</option>
                  <option value="Bodyweight Only">Bodyweight Only</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-900 font-semibold mb-2">Injuries or Limitations (Optional)</label>
                <textarea
                  value={limitations}
                  onChange={(e) => setLimitations(e.target.value)}
                  placeholder="e.g., Lower back pain, knee injury, etc."
                  className="w-full p-3 border rounded text-gray-900"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-gray-900 font-semibold mb-2">Preferences (Optional)</label>
                <textarea
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="e.g., Love squats, prefer upper body focus, enjoy high intensity, etc."
                  className="w-full p-3 border rounded text-gray-900"
                  rows={3}
                />
              </div>

              <button
                onClick={generatePlan}
                disabled={generating}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded hover:bg-blue-700 font-bold text-lg disabled:bg-gray-400"
              >
                {generating ? 'Generating Your Plan...' : 'Generate My Workout Plan'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Your Personalized Workout Plan</h2>
                <div className="space-x-2">
                  <button
                    onClick={saveAllWorkouts}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                  >
                    Save All Workouts
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedPlan([])
                      setGoal('')
                      setExperience('')
                      setEquipment('')
                      setLimitations('')
                      setPreferences('')
                    }}
                    className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                  >
                    Generate New Plan
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {generatedPlan.map((workout, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{workout.name}</h3>
                      <p className="text-gray-600">{workout.exercises.length} exercises</p>
                    </div>
                    <button
                      onClick={() => saveWorkoutTemplate(workout)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Save This Workout
                    </button>
                  </div>
                  <ul className="space-y-3">
                    {workout.exercises.map((exercise: any, i: number) => (
                      <li key={i} className="flex items-start text-gray-700 bg-gray-50 p-3 rounded border">
                        <span className="font-semibold mr-3 text-blue-600">{i + 1}.</span>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {typeof exercise === 'string' ? exercise : exercise.name}
                          </div>
                          {typeof exercise === 'object' && exercise.sets && exercise.reps && (
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{exercise.sets} sets</span> × <span className="font-medium">{exercise.reps} reps</span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}