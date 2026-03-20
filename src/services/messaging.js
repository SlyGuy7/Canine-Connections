import { Client } from "@stomp/stompjs"
console.log("Messaging URL:", import.meta.env.VITE_MESSAGING_URL)
const BROKER_URL = import.meta.env.VITE_MESSAGING_URL
function getResponseQueue(type) {
  if (type === "request.auth.register") return "response.auth.register"
  if (type === "request.auth.login") return "response.auth.login"
  return ""
}
function makeCorrelationId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
}
export async function sendMessage(type, payload) {
  // ADD THIS LOG: Check what is actually in the payload before sending
  console.log(`[Messaging] Sending to ${type}:`, payload);
  return new Promise((resolve) => {
    const responseQueue = getResponseQueue(type)
    if (!responseQueue) {
      resolve({ success: false, error: "Unknown message type" })
      return
    }
    const correlationId = makeCorrelationId()
    const client = new Client({
      brokerURL: BROKER_URL,
      connectHeaders: {
        login: "admin",
        passcode: "REDACTED",
        host: "/"
      },
      reconnectDelay: 0,
      debug: (str) => console.log(str),
      onConnect: () => {
        let finished = false
        const subscription = client.subscribe(`/queue/${responseQueue}`, (message) => {
          const messageCorrelationId = message.headers["correlation_id"]
          if (messageCorrelationId !== correlationId) {
            return
          }
          if (finished) return
          finished = true
          try {
            const data = JSON.parse(message.body)
            subscription.unsubscribe()
            client.deactivate()
            resolve(data)
          } catch (error) {
            subscription.unsubscribe()
            client.deactivate()
            resolve({ success: false, error: "Invalid response from RabbitMQ" })
          }
        })
        client.publish({
          destination: `/queue/${type}`,
          headers: {
            "correlation_id": correlationId,
          },
          // Ensure this is sending the full payload
          body: JSON.stringify(payload),
        })
        setTimeout(() => {
          if (finished) return
          finished = true
          if (subscription) subscription.unsubscribe()
          client.deactivate()
          resolve({ success: false, error: "Request timed out" })
        }, 30000)
      },
      onStompError: () => {
        resolve({ success: false, error: "RabbitMQ STOMP error" })
      },
      onWebSocketError: () => {
        resolve({ success: false, error: "RabbitMQ WebSocket error" })
      },
    })
    client.activate()
  })
}