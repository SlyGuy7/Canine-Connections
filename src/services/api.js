const API = ""

export async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    data = { success: false, message: "Invalid JSON response from API" }
  }

  if (!res.ok) {
    return { success: false, ...data }
  }

  return data
}