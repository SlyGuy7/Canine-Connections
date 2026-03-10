console.log("Messaging URL:", import.meta.env.VITE_MESSAGING_URL)
const BASE_URL = import.meta.env.VITE_MESSAGING_URL

export async function sendMessage(type, payload) {
  try {
    const response = await fetch(`${BASE_URL}/api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type, payload })
    })

    return await response.json()
  } catch (error) {
  console.log("Messaging error", error)
  return { success: false, message: "Messaging container unreachable" }
}
}