// Global data cache that prevents duplicate RabbitMQ fetches as the user navigates between pages.
// Wraps the whole app (see main.jsx) and exposes get/invalidate functions via useDataCache().
import React, { useCallback, useMemo, useRef, useState } from "react"
import { sendMessage } from "../services/messaging"
import { DataCacheContext } from "./dataCache"

// One cached list. get() returns the cached value, or starts a fetch; callers that arrive while
// a fetch is in flight share it instead of receiving an empty list. A failed fetch is not cached,
// so the next get() retries.
function useCachedList(fetchList) {
  const [data, setData]       = useState(null) // null = not fetched yet, [] = fetched but empty
  const [loading, setLoading] = useState(false)
  const cache    = useRef(null)
  const inFlight = useRef(null)

  const get = useCallback((force = false) => {
    if (!force && cache.current) return Promise.resolve(cache.current)
    if (!force && inFlight.current) return inFlight.current

    setLoading(true)
    const request = fetchList()
      .then((list) => {
        if (list) {
          cache.current = list
          setData(list)
        }
        return list ?? []
      })
      .catch(() => [])
      .finally(() => {
        if (inFlight.current === request) inFlight.current = null
        setLoading(false)
      })
    inFlight.current = request
    return request
  }, [fetchList])

  const invalidate = useCallback(() => {
    cache.current = null
    setData(null)
  }, [])

  return { data, loading, get, invalidate }
}

// Fetchers resolve to the list, or null when the request failed (so it is retried later).
async function fetchDogs() {
  const result = await sendMessage("request.dogs.list", { limit: 500, offset: 0 })
  if (!result?.success || !Array.isArray(result.dogs)) return null
  return result.dogs.map((dog) => {
    // Split the comma-separated photo URLs into an array and take the first as the primary image.
    const photoList = dog.photos ? dog.photos.split(",").map(p => p.trim()).filter(Boolean) : []
    return { ...dog, photoList, image: photoList[0] ?? null }
  })
}

async function fetchShelters() {
  const result = await sendMessage("request.shelters.list", {})
  return result?.success ? (result.shelters || []) : null
}

async function fetchQuizQuestions() {
  const result = await sendMessage("request.quiz.questions", {})
  return result?.success ? (result.questions || []) : null
}

export function DataCacheProvider({ children }) {
  const dogs     = useCachedList(fetchDogs)
  const shelters = useCachedList(fetchShelters)
  const quiz     = useCachedList(fetchQuizQuestions)

  // Memoized so consumers only re-render when cached data or loading state actually changes.
  const value = useMemo(() => ({
    dogs: dogs.data, shelters: shelters.data, quizQuestions: quiz.data,
    dogsLoading: dogs.loading, sheltersLoading: shelters.loading, quizLoading: quiz.loading,
    getDogs: dogs.get, getShelters: shelters.get, getQuizQuestions: quiz.get,
    // Invalidate clears the cache so the next get re-fetches (e.g. after adding a dog in AdminDogs).
    invalidateDogs: dogs.invalidate, invalidateShelters: shelters.invalidate, invalidateQuiz: quiz.invalidate,
  }), [
    dogs.data, dogs.loading, dogs.get, dogs.invalidate,
    shelters.data, shelters.loading, shelters.get, shelters.invalidate,
    quiz.data, quiz.loading, quiz.get, quiz.invalidate,
  ])

  return <DataCacheContext.Provider value={value}>{children}</DataCacheContext.Provider>
}
