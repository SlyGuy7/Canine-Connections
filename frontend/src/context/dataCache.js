// Data cache context and hook, kept apart from DataCacheProvider so that file only exports a
// component (required for React fast refresh).
import { createContext, useContext } from "react";

export const DataCacheContext = createContext(null);

// Returns { dogs, shelters, quizQuestions, *Loading, getDogs, getShelters, getQuizQuestions, invalidate* }.
export function useDataCache() {
  return useContext(DataCacheContext);
}
