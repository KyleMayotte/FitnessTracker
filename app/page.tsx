'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [workouts, setWorkouts] = useState([])
  const [goals, setGoals] = useState<any>(null)
  const [weeklyWorkoutCount, setWeeklyWorkoutCount] = useState(0)
  const [templates, setTemplates] = useState([])
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [exercises, setExercises] = useState<string[]>([''])
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState<string[]>([])
  const [exerciseSearchResults, setExerciseSearchResults] = useState<any[]>([])
  const [searchingExercise, setSearchingExercise] = useState(false)
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null)
  const [workoutNameSuggestions, setWorkoutNameSuggestions] = useState<string[]>([])
  const [showWorkoutNameSuggestions, setShowWorkoutNameSuggestions] = useState(false)
  const [searchingWorkoutName, setSearchingWorkoutName] = useState(false)

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

  const fetchWorkouts = async () => {
    const response = await fetch('/api/sessions')
    const data = await response.json()
    setWorkouts(data.sessions || [])
    
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = (data.sessions || []).filter((w: any) => new Date(w.date) >= weekAgo)
    setWeeklyWorkoutCount(thisWeek.length)
  }

  const fetchTemplates = async () => {
    const response = await fetch('/api/templates')
    const data = await response.json()
    setTemplates(data.templates || [])
  }

  const addExerciseField = () => {
    setExercises([...exercises, ''])
  }

  const updateExercise = (index: number, value: string) => {
    const newExercises = [...exercises]
    newExercises[index] = value
    setExercises(newExercises)
  }

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const searchExercise = async (query: string, index: number) => {
    if (query.length < 2) {
      setExerciseSearchResults([])
      return
    }

    setSearchingExercise(true)
    setActiveExerciseIndex(index)

    const response = await fetch(`/api/exercise-search?query=${encodeURIComponent(query)}`)
    const data = await response.json()
    setExerciseSearchResults(data.exercises || [])
    setSearchingExercise(false)
  }

  const selectExercise = (exerciseName: string, index: number) => {
    updateExercise(index, exerciseName)
    setExerciseSearchResults([])
    setActiveExerciseIndex(null)
  }

  const searchWorkoutName = async (query: string) => {
    if (query.length < 2) {
      setWorkoutNameSuggestions([])
      setShowWorkoutNameSuggestions(false)
      return
    }

    setSearchingWorkoutName(true)
    setShowWorkoutNameSuggestions(true)

    try {
      const response = await fetch(`/api/workout-name-suggestions?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      setWorkoutNameSuggestions(data.suggestions || [])
    } catch (e) {
      console.error('Error fetching workout name suggestions:', e)
      setWorkoutNameSuggestions([])
    }

    setSearchingWorkoutName(false)
  }

  const selectWorkoutName = (name: string) => {
    setTemplateName(name)
    setShowWorkoutNameSuggestions(false)
    setWorkoutNameSuggestions([])
  }

  const saveTemplate = async () => {
    const validExercises = exercises.filter(e => e.trim() !== '')
    
    if (!templateName || validExercises.length === 0) {
      alert('Please enter a template name and at least one exercise')
      return
    }

    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName,
        exercises: validExercises.map(name => ({ name, sets: [] }))
      })
    })

    setTemplateName('')
    setExercises([''])
    setShowNewTemplate(false)
    fetchTemplates()
  }

  const startEditTemplate = (template: any) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setExercises(template.exercises.map((e: any) => e.name))
    setShowNewTemplate(true)
  }

  const updateTemplate = async () => {
    const validExercises = exercises.filter(e => e.trim() !== '')
    
    if (!templateName || validExercises.length === 0) {
      alert('Please enter a template name and at least one exercise')
      return
    }

    await fetch('/api/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingTemplate._id,
        name: templateName,
        exercises: validExercises.map(name => ({ name, sets: [] }))
      })
    })

    setTemplateName('')
    setExercises([''])
    setShowNewTemplate(false)
    setEditingTemplate(null)
    fetchTemplates()
  }

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this workout?')) {
      return
    }

    await fetch(`/api/templates?id=${templateId}`, {
      method: 'DELETE'
    })

    fetchTemplates()
  }

  const cancelEdit = () => {
    setTemplateName('')
    setExercises([''])
    setShowNewTemplate(false)
    setEditingTemplate(null)
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWorkouts()
      fetchGoals()
      fetchTemplates()
    }
  }, [status])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return null
  }

  const workoutProgress = goals?.weeklyWorkouts 
    ? Math.min((weeklyWorkoutCount / goals.weeklyWorkouts) * 100, 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">
            Fitness Tracker
          </h1>
          <div className="text-right">
            <p className="text-gray-700 mb-2">Welcome, {session.user?.name}!</p>
            <div className="space-x-2">
              <a
                href="/progress"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block"
              >
                Progress
              </a>
              <a
                href="/food"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
              >
                Food
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

        {goals && goals.weeklyWorkouts && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-bold mb-2 text-gray-900">Weekly Workout Progress</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500 flex items-center justify-center text-white text-sm font-semibold"
                  style={{ width: `${workoutProgress}%` }}
                >
                  {workoutProgress > 10 && `${Math.round(workoutProgress)}%`}
                </div>
              </div>
              <span className="text-gray-700 font-semibold whitespace-nowrap">
                {weeklyWorkoutCount} / {goals.weeklyWorkouts} workouts
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <button
            onClick={() => router.push('/ai-workout')}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded hover:bg-purple-700 font-semibold"
          >
            ✨ Generate AI Workout Plan
          </button>
          <button
            onClick={() => setShowNewTemplate(!showNewTemplate)}
            className="w-full bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 font-semibold"
          >
            {showNewTemplate ? 'Cancel' : '+ Create New Workout'}
          </button>
        </div>

        {showNewTemplate && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              {editingTemplate ? 'Edit Workout' : 'New Workout'}
            </h2>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Workout name (e.g., Push Day)"
                value={templateName}
                onChange={(e) => {
                  setTemplateName(e.target.value)
                  searchWorkoutName(e.target.value)
                }}
                onFocus={() => {
                  if (templateName.length >= 2) {
                    searchWorkoutName(templateName)
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowWorkoutNameSuggestions(false)
                  }, 200)
                }}
                className="w-full p-3 border rounded text-gray-900"
              />
              {showWorkoutNameSuggestions && workoutNameSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                  {workoutNameSuggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      onClick={() => selectWorkoutName(suggestion)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-semibold text-gray-900">{suggestion}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <h3 className="font-bold mb-2 text-gray-900">Exercises:</h3>
            {exercises.map((exercise, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <div className="flex-1 relative">
  <input
    type="text"
    placeholder="Exercise name (e.g., Bench Press)"
    value={exercise}
    onChange={(e) => {
      updateExercise(index, e.target.value)
      searchExercise(e.target.value, index)
    }}
    onFocus={() => {
      if (exercise.length >= 2) {
        searchExercise(exercise, index)
      }
    }}
    onBlur={() => {
      setTimeout(() => {
        setExerciseSearchResults([])
        setActiveExerciseIndex(null)
      }, 200)
    }}
    className="w-full p-2 border rounded text-gray-900"
  />
  {activeExerciseIndex === index && exerciseSearchResults.length > 0 && (
    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
      {exerciseSearchResults.map((ex, i) => (
        <div
          key={i}
          onClick={() => selectExercise(ex.name, index)}
          className="p-3 hover:bg-blue-50 cursor-pointer border-b"
        >
          <div className="font-semibold text-gray-900 capitalize">{ex.name}</div>
          <div className="text-xs text-gray-600 capitalize">
            {ex.muscle} • {ex.equipment} • {ex.difficulty}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
                {exercises.length > 1 && (
                  <button
                    onClick={() => removeExercise(index)}
                    className="bg-red-600 text-white px-4 rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            
            <button
              onClick={addExerciseField}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 mb-4"
            >
              + Add Exercise
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={editingTemplate ? updateTemplate : saveTemplate}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 font-semibold"
              >
                {editingTemplate ? 'Update Workout' : 'Save Workout'}
              </button>
              <button
                onClick={cancelEdit}
                className="bg-gray-600 text-white px-6 py-3 rounded hover:bg-gray-700 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">My Workouts</h2>
          {!templates || templates.length === 0 ? (
            <p className="text-gray-500">No workouts yet. Create one above!</p>
          ) : (
            <div className="space-y-3">
              {templates.map((template: any) => (
                <div 
                  key={template._id}
                  className="border rounded p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/workout/${template._id}`)}
                    >
                      <h3 className="font-bold text-lg text-gray-900">{template.name}</h3>
                      <p className="text-gray-600 text-sm">
                        {template.exercises.length} exercises
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {template.exercises.map((e: any) => e.name).join(', ')}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditTemplate(template)
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTemplate(template._id)
                        }}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
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