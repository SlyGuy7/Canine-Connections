import React, { createContext, useContext, useRef, useState, useCallback } from "react"
import { sendMessage } from "../services/messaging"

const DataCacheContext = createContext(null)

export function DataCacheProvider({ children }) {
  const [dogs, setDogs] = useState(null)
  const [shelters, setShelters] = useState(null)
  const [quizQuestions, setQuizQuestions] = useState(null)
  const [dogsLoading, setDogsLoading] = useState(false)
  const [sheltersLoading, setSheltersLoading] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const dogsFetched = useRef(false)
  const sheltersFetched = useRef(false)
  const quizFetched = useRef(false)

  const getDogs = useCallback(async (force = false) => {
    if (dogs && !force) return dogs
    if (dogsFetched.current && !force) return dogs ?? []
    dogsFetched.current = true
    setDogsLoading(true)
    try {
      const result = await sendMessage("request.dogs.list", { limit: 500, offset: 0 })
      if (result?.success && Array.isArray(result.dogs)) {
        const mapped = result.dogs.map((dog) => ({
          ...dog,
          photoList: dog.photos ? dog.photos.split(",").map(p => p.trim()).filter(Boolean) : [],
          image: dog.photos ? dog.photos.split(",")[0].trim() : null,
        }))
        setDogs(mapped)
        return mapped
      }
      dogsFetched.current = false
      return []
    } catch {
      dogsFetched.current = false
      return []
    } finally {
      setDogsLoading(false)
    }
  }, [dogs])

  const getShelters = useCallback(async (force = false) => {
    if (shelters && !force) return shelters
    if (sheltersFetched.current && !force) return shelters ?? []
    sheltersFetched.current = true
    setSheltersLoading(true)
    try {
      const result = await sendMessage("request.shelters.list", {})
      if (result?.success) {
        setShelters(result.shelters || [])
        return result.shelters || []
      }
      sheltersFetched.current = false
      return []
    } catch {
      sheltersFetched.current = false
      return []
    } finally {
      setSheltersLoading(false)
    }
  }, [shelters])

  const getQuizQuestions = useCallback(async (force = false) => {
    if (quizQuestions && !force) return quizQuestions
    if (quizFetched.current && !force) return quizQuestions ?? []
    quizFetched.current = true
    setQuizLoading(true)
    try {
      const result = await sendMessage("request.quiz.questions", {})
      if (result?.success) {
        setQuizQuestions(result.questions || [])
        return result.questions || []
      }
      quizFetched.current = false
      return []
    } catch {
      quizFetched.current = false
      return []
    } finally {
      setQuizLoading(false)
    }
  }, [quizQuestions])

  const invalidateDogs = useCallback(() => {
    dogsFetched.current = false
    setDogs(null)
  }, [])

  const invalidateShelters = useCallback(() => {
    sheltersFetched.current = false
    setShelters(null)
  }, [])

  const invalidateQuiz = useCallback(() => {
    quizFetched.current = false
    setQuizQuestions(null)
  }, [])

  return (
    <DataCacheContext.Provider value={{
      dogs, shelters, quizQuestions,
      dogsLoading, sheltersLoading, quizLoading,
      getDogs, getShelters, getQuizQuestions,
      invalidateDogs, invalidateShelters, invalidateQuiz,
    }}>
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache() {
  return useContext(DataCacheContext)
}