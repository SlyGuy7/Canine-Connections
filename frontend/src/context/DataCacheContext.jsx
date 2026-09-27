// Global data cache that prevents duplicate RabbitMQ fetches as the user navigates between pages.
// Wraps the whole app (see main.jsx) and exposes get/invalidate functions via useDataCache().
import React, { createContext, useContext, useRef, useState, useCallback } from "react"
import { sendMessage } from "../services/messaging"

const DataCacheContext = createContext(null)

export function DataCacheProvider({ children }) {
  // Cached data — null means not yet fetched, [] means fetched but empty.
  const [dogs, setDogs] = useState(null)
  const [shelters, setShelters] = useState(null)
  const [quizQuestions, setQuizQuestions] = useState(null)

  // Loading flags exposed so components can show spinners while data is in-flight.
  const [dogsLoading, setDogsLoading] = useState(false)
  const [sheltersLoading, setSheltersLoading] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)

  // useRef tracks whether a fetch has already been initiated, preventing duplicate in-flight requests.
  const dogsFetched = useRef(false)
  const sheltersFetched = useRef(false)
  const quizFetched = useRef(false)

  // Returns the cached dog list, fetching from RabbitMQ only on the first call (or when force=true).
  // The comma-separated photos string is split into a photoList array for convenience.
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
          // Split the comma-separated photo URLs into an array and take the first as the primary image.
          photoList: dog.photos ? dog.photos.split(",").map(p => p.trim()).filter(Boolean) : [],
          image: dog.photos ? dog.photos.split(",")[0].trim() : null,
        }))
        setDogs(mapped)
        return mapped
      }
      // Reset so a future call can retry.
      dogsFetched.current = false
      return []
    } catch {
      dogsFetched.current = false
      return []
    } finally {
      setDogsLoading(false)
    }
  }, [dogs])

  // Returns the cached shelter list, fetching from RabbitMQ only on the first call.
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

  // Returns the cached quiz questions, fetching from RabbitMQ only on the first call.
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

  // Invalidate functions clear the cache so the next getDogs/getShelters/getQuizQuestions call
  // re-fetches fresh data from the backend (e.g. after adding a new dog in AdminDogs).
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