'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [workoutStarted, setWorkoutStarted] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTemplate()
      fetchLastSession()
      loadWorkoutProgress()
    }
  }, [status, templateId])

  // Timer effect
  useEffect(() => {
    if (workoutStarted) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [workoutStarted])

  // Save to localStorage whenever exercises change and workout is started
  useEffect(() => {
    if (workoutStarted && currentExercises.length > 0) {
      saveWorkoutProgress()
    }
  }, [currentExercises, workoutStarted])

  // Navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (workoutStarted) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [workoutStarted])

  const getStorageKey = () => `workout_progress_${templateId}`

  const saveWorkoutProgress = () => {
    const progressData = {
      exercises: currentExercises,
      elapsedTime,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem(getStorageKey(), JSON.stringify(progressData))
  }

  const loadWorkoutProgress = () => {
    const saved = localStorage.getItem(getStorageKey())
    if (saved) {
      try {
        const progressData = JSON.parse(saved)
        setCurrentExercises(progressData.exercises)
        setElapsedTime(progressData.elapsedTime || 0)
        setWorkoutStarted(true)
      } catch (error) {
        console.error('Failed to load workout progress:', error)
      }
    }
  }

  const clearWorkoutProgress = () => {
    localStorage.removeItem(getStorageKey())
    setElapsedTime(0)
    setWorkoutStarted(false)
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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

  const startWorkout = () => {
    setWorkoutStarted(true)
    setElapsedTime(0)
  }

  const handleCancelWorkout = () => {
    setShowCancelConfirm(true)
  }

  const confirmCancelWorkout = () => {
    clearWorkoutProgress()
    setShowCancelConfirm(false)
    router.push('/')
  }

  const handleBack = () => {
    if (workoutStarted) {
      if (confirm('You have an active workout. Are you sure you want to leave? Your progress will be saved.')) {
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }

  const finishWorkout = async () => {
    if (!confirm('Finish and save this workout?')) {
      return
    }

    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: templateId,
        templateName: template.name,
        exercises: currentExercises
      })
    })

    clearWorkoutProgress()
    router.push('/')
  }

  if (status === 'loading' || !template) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return null
  }

  // Preview screen - shown before workout starts
  if (!workoutStarted) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-blue-600">
              {template.name}
            </h1>
            <button
              onClick={handleBack}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Back
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Workout Preview</h2>
            <p className="text-gray-600 mb-4">
              This workout contains {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}
            </p>

            <div className="space-y-3 mb-6">
              {template.exercises.map((exercise: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-bold text-gray-900">{exercise.name}</h3>
                  {exercise.recommendedSets && exercise.recommendedReps && (
                    <p className="text-sm text-purple-600">
                      AI Recommended: {exercise.recommendedSets} sets × {exercise.recommendedReps} reps
                    </p>
                  )}
                </div>
              ))}
            </div>

            {lastSession && (
              <div className="bg-blue-50 p-4 rounded mb-6">
                <h3 className="font-bold text-gray-900 mb-2">Last Workout</h3>
                <p className="text-sm text-gray-600">
                  {new Date(lastSession.date).toLocaleDateString()} at {new Date(lastSession.date).toLocaleTimeString()}
                </p>
              </div>
            )}

            <button
              onClick={startWorkout}
              className="w-full bg-green-600 text-white px-6 py-4 rounded hover:bg-green-700 font-bold text-xl"
            >
              Start Workout
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active workout screen
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Fixed header with timer */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 sticky top-4 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">
                {template.name}
              </h1>
              <p className="text-sm text-gray-600">Workout in progress</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600 font-mono">
                {formatTime(elapsedTime)}
              </div>
              <p className="text-xs text-gray-500">Elapsed time</p>
            </div>
          </div>
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

        <div className="flex gap-4">
          <button
            onClick={handleCancelWorkout}
            className="flex-1 bg-red-600 text-white px-6 py-4 rounded hover:bg-red-700 font-bold text-lg"
          >
            Cancel Workout
          </button>
          <button
            onClick={finishWorkout}
            className="flex-1 bg-green-600 text-white px-6 py-4 rounded hover:bg-green-700 font-bold text-lg"
          >
            Finish Workout
          </button>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Workout?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel this workout? All your progress will be lost and cannot be recovered.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 bg-gray-600 text-white px-4 py-3 rounded hover:bg-gray-700 font-semibold"
                >
                  Keep Working Out
                </button>
                <button
                  onClick={confirmCancelWorkout}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded hover:bg-red-700 font-semibold"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}