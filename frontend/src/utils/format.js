// Display helpers for values stored as database enums.

// "extra_large" -> "Extra large"
export function formatEnum(value) {
  if (!value) return ""
  const text = String(value).replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}
