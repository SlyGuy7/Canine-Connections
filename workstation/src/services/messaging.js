import { Client } from "@stomp/stompjs";

const BROKER_URL = import.meta.env.VITE_MESSAGING_URL || "ws://100.87.19.28:15674/ws";
const REQUEST_TIMEOUT_MS = 15000;

function makeCorrelationId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function sendMessage(type, payload) {
  return new Promise((resolve) => {
    console.log(`[STOMP] sendMessage called — type: ${type}`);
    console.log(`[STOMP] Payload:`, payload);

    const correlationId = makeCorrelationId();
    const replyQueue    = `${type}.reply.${correlationId}`;

    console.log(`[STOMP] Request queue:  /queue/${type}`);
    console.log(`[STOMP] Reply queue:    /queue/${replyQueue}`);
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
        console.log(`[STOMP] Connected — subscribing to /queue/${replyQueue}`);
        let finished = false;

        const subscription = client.subscribe(`/queue/${replyQueue}`, (message) => {
          if (finished) {
            console.warn(`[STOMP][WARN] Already resolved — ignoring duplicate message`);
            return;
          }

          finished = true;
          isResolved = true;

          console.log(`[STOMP] Response received on /queue/${replyQueue}`);
          console.log(`[STOMP] Raw response body: ${message.body}`);

          try {
            const data = JSON.parse(message.body);
            console.log(`[STOMP] Parsed response:`, data);
            if (!data.success) {
              console.warn(`[STOMP][WARN] success=false for ${type} — error: ${data.error || "unknown"}`);
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
            "reply-to":       `/queue/${replyQueue}`,
          },
          body: JSON.stringify(payload),
        });
        console.log(`[STOMP] Message published — waiting for response (${REQUEST_TIMEOUT_MS / 1000}s timeout)`);

        setTimeout(() => {
          if (!finished) {
            finished = true;
            isResolved = true;
            console.error(`[STOMP][ERROR] Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s for type: ${type}`);
            cleanup({ success: false, error: "Request timed out" });
          }
        }, REQUEST_TIMEOUT_MS);

        function cleanup(resultData) {
          console.log(`[STOMP] Cleaning up — type: ${type}`);
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