// Display helpers for values stored as database enums.

// "extra_large" -> "Extra large"
export function formatEnum(value) {
  if (!value) return ""
  const text = String(value).replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Age in words, matching the Browse page filter (Puppy 0–1, Young 2–3, Adult 4–7, Senior 8+).
export function ageGroup(years) {
  const y = Number(years)
  if (y <= 1) return "Puppy"
  if (y <= 3) return "Young"
  if (y <= 7) return "Adult"
  return "Senior"
}
