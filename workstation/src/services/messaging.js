import { Client } from "@stomp/stompjs";

console.log("[STOMP] Messaging module loaded");
console.log("[STOMP] Messaging URL:", import.meta.env.VITE_MESSAGING_URL || "ws://localhost:15674/ws (fallback)");

const BROKER_URL = import.meta.env.VITE_MESSAGING_URL || "ws://localhost:15674/ws";

function getResponseQueue(type) {
  switch (type) {
    // AUTH
    case "request.auth.register":         return "response.auth.register";
    case "request.auth.login":            return "response.auth.login";
    case "request.auth.resetPassword":    return "response.auth.resetPassword";

    // PROFILE
    case "request.profile.update":        return "response.profile.update";

    // DOGS
    case "request.dogs.list":             return "response.dogs.list";
    case "request.dogs.get":              return "response.dogs.get";

    // SHELTERS
    case "request.shelters.list":         return "response.shelters.list";
    case "request.shelters.get":          return "response.shelters.get";

    // APPLICATIONS
    case "request.application.submit":    return "response.application.submit";
    case "request.application.status":    return "response.application.status";
    case "request.application.list":      return "response.application.list";
    case "request.application.approve":   return "response.application.decision";
    case "request.application.reject":    return "response.application.decision";

    // ADOPTIONS
    case "request.adoptions.list":        return "response.adoptions.list";
    case "request.adoptions.get":         return "response.adoptions.get";
    case "request.adoptions.finalize":    return "response.adoptions.finalize";

    // QUIZ
    case "request.quiz.questions":        return "response.quiz.questions";
    case "request.quiz.submit":           return "response.quiz.result";
    case "request.quiz.results":          return "response.quiz.results";

    // POST ADOPTION LOGS
    case "request.adoption.log.create":   return "response.adoption.log.create";
    case "request.adoption.log.list":     return "response.adoption.log.list";

    // VIRTUAL FOSTER
    case "request.foster.apply":          return "response.foster.apply";
    case "request.foster.list":           return "response.foster.list";
    case "request.foster.cancel":         return "response.foster.cancel";

    // PET PARKS
    case "request.parks.list":            return "response.parks.list";

    // RESOURCES
    case "request.resources.list":        return "response.resources.list";
    case "request.resources.get":         return "response.resources.get";

    // SUCCESS STORIES
    case "request.stories.list":          return "response.stories.list";
    case "request.stories.submit":        return "response.stories.submit";
    case "request.stories.approve":       return "response.stories.approve";

    // BADGES
    case "request.badges.list":           return "response.badges.list";
    case "request.badges.mine":           return "response.badges.mine";

    // CHAT / ENQUIRY
    case "request.enquiry.send":          return "response.enquiry.reply";
    case "request.chat.start":            return "response.chat.start";
    case "request.chat.message":          return "response.chat.message";
    case "request.chat.history":          return "response.chat.history";

    // MEET AND GREET
    case "request.meetgreet.schedule":    return "response.meetgreet.schedule";
    case "request.meetgreet.list":        return "response.meetgreet.list";
    case "request.meetgreet.cancel":      return "response.meetgreet.cancel";

    // NOTIFICATIONS
    case "request.notifications.list":    return "response.notifications.list";
    case "request.notifications.read":    return "response.notifications.read";

    // API KEYS
    case "request.api.key.get":           return "response.api.key.get";
    case "request.api.key.regenerate":    return "response.api.key.regenerate";
    case "request.api.logs":              return "response.api.logs";

    default:
      return "";
  }
}

function makeCorrelationId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function sendMessage(type, payload) {
  return new Promise((resolve) => {
    console.log(`[STOMP] sendMessage called — type: ${type}`);
    console.log(`[STOMP] Payload:`, payload);

    const responseQueue = getResponseQueue(type);

    if (!responseQueue) {
      console.error(`[STOMP][ERROR] Unknown message type: ${type} — no response queue mapped`);
      resolve({ success: false, error: `Unknown message type: ${type}` });
      return;
    }

    console.log(`[STOMP] Request queue:  /queue/${type}`);
    console.log(`[STOMP] Response queue: /queue/${responseQueue}`);

    const correlationId = makeCorrelationId();
    console.log(`[STOMP] Correlation ID: ${correlationId}`);

    let isResolved = false;

    const client = new Client({
      brokerURL: BROKER_URL,
      connectHeaders: {
        login: "admin",
        passcode: "REDACTED",
        host: "/"
      },
      reconnectDelay: 0,
      debug: (str) => console.log(`[STOMP][DEBUG] ${str}`),

      onConnect: () => {
        console.log(`[STOMP] Connected to broker — subscribing to /queue/${responseQueue}`);
        let finished = false;

        const subscription = client.subscribe(`/queue/${responseQueue}`, (message) => {
          const messageCorrelationId =
            message.headers["correlation-id"] || message.headers["correlation_id"];

          console.log(`[STOMP] Message received on /queue/${responseQueue}`);
          console.log(`[STOMP] Message correlation ID: ${messageCorrelationId}`);
          console.log(`[STOMP] Expected correlation ID: ${correlationId}`);

          if (messageCorrelationId !== correlationId) {
            console.warn(`[STOMP][WARN] Correlation ID mismatch — ignoring message`);
            return;
          }

          if (finished) {
            console.warn(`[STOMP][WARN] Already resolved — ignoring duplicate message`);
            return;
          }

          finished = true;
          isResolved = true;

          console.log(`[STOMP] Raw response body: ${message.body}`);

          try {
            const data = JSON.parse(message.body);
            console.log(`[STOMP] Parsed response:`, data);
            if (!data.success) {
              console.warn(`[STOMP][WARN] Response returned success=false for ${type} — error: ${data.error || "unknown"}`);
            }
            cleanup(data);
          } catch (error) {
            console.error(`[STOMP][ERROR] Failed to parse response JSON for ${type}:`, error);
            cleanup({ success: false, error: "Invalid response from RabbitMQ" });
          }
        });

        console.log(`[STOMP] Publishing to /queue/${type}`);
        client.publish({
          destination: `/queue/${type}`,
          headers: {
            "correlation-id": correlationId,
          },
          body: JSON.stringify(payload),
        });
        console.log(`[STOMP] Message published — waiting for response (30s timeout)`);

        setTimeout(() => {
          if (!finished) {
            finished = true;
            isResolved = true;
            console.error(`[STOMP][ERROR] Request timed out after 30s for type: ${type}`);
            console.error(`[STOMP][ERROR] No response received on /queue/${responseQueue} with corr ID: ${correlationId}`);
            cleanup({ success: false, error: "Request timed out" });
          }
        }, 30000);

        function cleanup(resultData) {
          console.log(`[STOMP] Cleaning up subscription and deactivating client for type: ${type}`);
          subscription.unsubscribe();
          client.deactivate();
          resolve(resultData);
        }
      },

      onDisconnect: () => {
        console.log(`[STOMP] Client disconnected for type: ${type}`);
      },

      onStompError: (frame) => {
        console.error(`[STOMP][ERROR] STOMP broker error for type: ${type}`);
        console.error(`[STOMP][ERROR] Message: ${frame.headers["message"]}`);
        console.error(`[STOMP][ERROR] Body: ${frame.body}`);
        if (!isResolved) {
          isResolved = true;
          resolve({ success: false, error: "RabbitMQ STOMP error: " + frame.headers["message"] });
        }
      },

      onWebSocketError: (evt) => {
        console.error(`[STOMP][ERROR] WebSocket error for type: ${type}`);
        console.error(`[STOMP][ERROR] Event:`, evt);
        console.error(`[STOMP][ERROR] Broker URL was: ${BROKER_URL}`);
        if (!isResolved) {
          isResolved = true;
          resolve({ success: false, error: "RabbitMQ WebSocket error" });
        }
      },

      onWebSocketClose: (evt) => {
        console.warn(`[STOMP][WARN] WebSocket closed for type: ${type}`);
        console.warn(`[STOMP][WARN] Close code: ${evt.code} — reason: ${evt.reason || "none"}`);
      },
    });

    console.log(`[STOMP] Activating STOMP client for type: ${type}`);
    client.activate();
  });
}