'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'

export default function WorkoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string
  
  const [template, setTemplate] = useState<any>(null)
  const [lastSession, setLastSession] = useState<any>(null)
  const [currentExercises, setCurrentExercises] = useState<any[]>([])
  const [newExerciseName, setNewExerciseName] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTemplate()
      fetchLastSession()
    }
  }, [status, templateId])

  const fetchTemplate = async () => {
    const response = await fetch('/api/templates')
    const data = await response.json()
    const temp = data.templates.find((t: any) => t._id === templateId)
    setTemplate(temp)

    if (temp) {
      setCurrentExercises(temp.exercises.map((e: any) => {
        // Check if the template has pre-filled sets from AI (with recommendedSets/recommendedReps)
        if (e.sets && e.sets.length > 0) {
          // Use the existing sets from the template
          return {
            name: e.name,
            sets: e.sets.map((s: any) => ({
              weight: s.weight || '',
              reps: s.reps || ''
            })),
            recommendedSets: e.recommendedSets,
            recommendedReps: e.recommendedReps
          }
        } else {
          // Old format - create a single empty set
          return {
            name: e.name,
            sets: [{ weight: '', reps: '' }]
          }
        }
      }))
    }
  }

  const fetchLastSession = async () => {
    const response = await fetch(`/api/sessions?templateId=${templateId}`)
    const data = await response.json()
    if (data.sessions && data.sessions.length > 0) {
      setLastSession(data.sessions[0])
    }
  }

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...currentExercises]
    newExercises[exerciseIndex].sets.push({ weight: '', reps: '' })
    setCurrentExercises(newExercises)
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: string, value: string) => {
    const newExercises = [...currentExercises]
    newExercises[exerciseIndex].sets[setIndex][field] = value
    setCurrentExercises(newExercises)
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...currentExercises]
    newExercises[exerciseIndex].sets = newExercises[exerciseIndex].sets.filter((_: any, i: number) => i !== setIndex)
    setCurrentExercises(newExercises)
  }

  const addExercise = () => {
    if (!newExerciseName.trim()) {
      alert('Please enter an exercise name')
      return
    }
    setCurrentExercises([...currentExercises, {
      name: newExerciseName,
      sets: [{ weight: '', reps: '' }]
    }])
    setNewExerciseName('')
  }

  const removeExercise = (exerciseIndex: number) => {
    if (!confirm('Remove this exercise from this workout?')) {
      return
    }
    setCurrentExercises(currentExercises.filter((_, i) => i !== exerciseIndex))
  }

  const updateExerciseName = (exerciseIndex: number, newName: string) => {
    const newExercises = [...currentExercises]
    newExercises[exerciseIndex].name = newName
    setCurrentExercises(newExercises)
  }

  const finishWorkout = async () => {
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: templateId,
        templateName: template.name,
        exercises: currentExercises
      })
    })
    router.push('/')
  }

  if (status === 'loading' || !template) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">
            {template.name}
          </h1>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back
          </button>
        </div>

        {currentExercises.map((exercise, exerciseIndex) => {
          const lastExercise = lastSession?.exercises.find((e: any) => e.name === exercise.name)
          
          return (
            <div key={exerciseIndex} className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(e) => updateExerciseName(exerciseIndex, e.target.value)}
                    className="text-2xl font-bold text-gray-900 border-b-2 border-transparent hover:border-blue-300 focus:border-blue-500 outline-none w-full"
                  />
                  {exercise.recommendedSets && exercise.recommendedReps && (
                    <p className="text-sm text-purple-600 font-semibold mt-1">
                      AI Recommended: {exercise.recommendedSets} sets × {exercise.recommendedReps} reps
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeExercise(exerciseIndex)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm ml-4"
                >
                  Remove Exercise
                </button>
              </div>

              {lastExercise && (
                <div className="bg-blue-50 p-3 rounded mb-4">
                  <p className="text-sm font-semibold text-gray-900">Last time:</p>
                  {lastExercise.sets.map((set: any, i: number) => (
                    <p key={i} className="text-sm text-gray-700">
                      Set {i + 1}: {set.weight} lbs × {set.reps} reps
                    </p>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {exercise.sets.map((set: any, setIndex: number) => (
                  <div key={setIndex} className="flex gap-3 items-center">
                    <span className="font-semibold text-gray-900 w-12">Set {setIndex + 1}</span>
                    <input
                      type="number"
                      placeholder="Weight"
                      value={set.weight}
                      onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', e.target.value)}
                      className="w-24 p-2 border rounded text-gray-900"
                    />
                    <span className="text-gray-700">lbs ×</span>
                    <input
                      type="number"
                      placeholder="Reps"
                      value={set.reps}
                      onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', e.target.value)}
                      className="w-20 p-2 border rounded text-gray-900"
                    />
                    <span className="text-gray-700">reps</span>
                    {exercise.sets.length > 1 && (
                      <button
                        onClick={() => removeSet(exerciseIndex, setIndex)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => addSet(exerciseIndex)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                + Add Set
              </button>
            </div>
          )
        })}

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Add Exercise to This Workout</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Exercise name (e.g., Cable Fly)"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              className="flex-1 p-2 border rounded text-gray-900"
            />
            <button
              onClick={addExercise}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </div>

        <button
          onClick={finishWorkout}
          className="w-full bg-green-600 text-white px-6 py-4 rounded hover:bg-green-700 font-bold text-lg"
        >
          Finish Workout
        </button>
      </div>
    </div>
  )
}