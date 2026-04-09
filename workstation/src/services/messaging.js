import { Client } from "@stomp/stompjs";

const BROKER_URL =
  import.meta.env.VITE_MESSAGING_URL || "ws://100.87.19.28:15674/ws";

const REQUEST_TIMEOUT_MS = 15000;

function makeCorrelationId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function sendMessage(type, payload) {
  return new Promise((resolve) => {
    const correlationId = makeCorrelationId();
    const replyQueue = `${type}.reply.${correlationId}`;

    // Keep request publish as /queue because that part is already working.
    const requestDestination = `/queue/${type}`;

    // IMPORTANT:
    // Replies are published by PHP workers directly to AMQP queue names.
    // To subscribe to an existing AMQP queue from STOMP, use /amq/queue/<name>.
    const replyDestination = `/amq/queue/${replyQueue}`;

    const subscribeReceiptId = `sub-${correlationId}`;

    let finished = false;
    let timeoutId = null;
    let subscription = null;

    console.log("==================================================");
    console.log("[STOMP] sendMessage() called");
    console.log("[STOMP] Type:", type);
    console.log("[STOMP] Payload:", payload);
    console.log("[STOMP] Broker URL:", BROKER_URL);
    console.log("[STOMP] Correlation ID:", correlationId);
    console.log("[STOMP] Request destination:", requestDestination);
    console.log("[STOMP] Reply queue name:", replyQueue);
    console.log("[STOMP] Reply destination:", replyDestination);
    console.log("[STOMP] Timeout (ms):", REQUEST_TIMEOUT_MS);
    console.log("==================================================");

    function finish(client, result, reason = "unknown") {
      if (finished) {
        console.warn("[STOMP][WARN] finish() called again, ignoring.");
        return;
      }

      finished = true;

      console.log("[STOMP] finish() called");
      console.log("[STOMP] Finish reason:", reason);
      console.log("[STOMP] Final result:", result);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        console.log("[STOMP] Cleared timeout");
      }

      try {
        if (subscription) {
          console.log("[STOMP] Unsubscribing from reply destination");
          subscription.unsubscribe();
        }
      } catch (err) {
        console.warn("[STOMP][WARN] Failed to unsubscribe cleanly:", err);
      }

      try {
        console.log("[STOMP] Deactivating STOMP client");
        client.deactivate();
      } catch (err) {
        console.warn("[STOMP][WARN] Failed to deactivate client cleanly:", err);
      }

      resolve(result);
    }

    const client = new Client({
      brokerURL: BROKER_URL,
      connectHeaders: {
        login: "admin",
        passcode: "REDACTED",
        host: "/",
      },
      reconnectDelay: 0,
      debug: (str) => console.log(`[STOMP][DEBUG] ${str}`),

      onConnect: () => {
        console.log("[STOMP] Connected to broker successfully");
        console.log("[STOMP] Creating reply subscription now...");

        try {
          client.watchForReceipt(subscribeReceiptId, () => {
            console.log("[STOMP] Reply subscription confirmed by broker");
            console.log("[STOMP] Safe to publish request now");

            try {
              client.publish({
                destination: requestDestination,
                headers: {
                  "correlation-id": correlationId,
                  "reply-to": replyQueue,
                },
                body: JSON.stringify(payload),
              });

              console.log("[STOMP] Request published successfully");
              console.log("[STOMP] Published to:", requestDestination);
              console.log("[STOMP] reply-to header:", replyQueue);
              console.log("[STOMP] correlation-id header:", correlationId);
            } catch (err) {
              console.error("[STOMP][ERROR] Failed to publish request:", err);
              finish(
                client,
                { success: false, error: "Failed to publish request" },
                "publish failed"
              );
            }
          });

          subscription = client.subscribe(
            replyDestination,
            (message) => {
              console.log("[STOMP] Reply message received");
              console.log("[STOMP] Reply destination hit:", replyDestination);
              console.log("[STOMP] Raw headers:", message.headers);
              console.log("[STOMP] Raw body:", message.body);

              if (finished) {
                console.warn(
                  "[STOMP][WARN] Received reply after request already finished. Ignoring."
                );
                return;
              }

              try {
                const parsed = JSON.parse(message.body);
                console.log("[STOMP] Parsed reply JSON:", parsed);

                if (!parsed?.success) {
                  console.warn("[STOMP][WARN] Reply came back but success=false");
                  console.warn(
                    "[STOMP][WARN] Backend error:",
                    parsed?.error || "unknown error"
                  );
                }

                finish(client, parsed, "reply received");
              } catch (err) {
                console.error("[STOMP][ERROR] Failed to parse reply JSON:", err);
                finish(
                  client,
                  {
                    success: false,
                    error: "Invalid response from RabbitMQ",
                  },
                  "invalid JSON reply"
                );
              }
            },
            {
              receipt: subscribeReceiptId,
            }
          );

          console.log("[STOMP] Subscribe frame sent");
          console.log("[STOMP] Waiting for subscription receipt before publishing...");
          console.log("[STOMP] Subscribe receipt id:", subscribeReceiptId);
        } catch (err) {
          console.error("[STOMP][ERROR] Failed while creating subscription:", err);

          finish(
            client,
            {
              success: false,
              error: "Failed to subscribe to reply queue",
            },
            "subscription creation failed"
          );
          return;
        }

        timeoutId = setTimeout(() => {
          if (finished) {
            return;
          }

          console.error(`[STOMP][ERROR] Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
          console.error("[STOMP][ERROR] Type:", type);
          console.error("[STOMP][ERROR] Correlation ID:", correlationId);
          console.error("[STOMP][ERROR] Reply destination:", replyDestination);
          console.error("[STOMP][ERROR] This usually means one of these things:");
          console.error("[STOMP][ERROR] 1. The worker never replied to the reply queue");
          console.error("[STOMP][ERROR] 2. The worker replied to the wrong queue name");
          console.error("[STOMP][ERROR] 3. The browser subscribed to the wrong STOMP destination");
          console.error("[STOMP][ERROR] 4. The backend reply body was invalid");

          finish(
            client,
            {
              success: false,
              error: "Request timed out",
            },
            "timeout"
          );
        }, REQUEST_TIMEOUT_MS);
      },

      onStompError: (frame) => {
        console.error("[STOMP][ERROR] Broker reported STOMP error");
        console.error(
          "[STOMP][ERROR] Message:",
          frame.headers["message"] || "no message"
        );
        console.error("[STOMP][ERROR] Headers:", frame.headers);
        console.error("[STOMP][ERROR] Body:", frame.body);

        finish(
          client,
          {
            success: false,
            error:
              "RabbitMQ STOMP error: " +
              (frame.headers["message"] || "unknown"),
          },
          "broker STOMP error"
        );
      },

      onWebSocketError: (evt) => {
        console.error("[STOMP][ERROR] WebSocket error");
        console.error("[STOMP][ERROR] Broker URL:", BROKER_URL);
        console.error("[STOMP][ERROR] Event:", evt);

        finish(
          client,
          {
            success: false,
            error: "RabbitMQ WebSocket error",
          },
          "websocket error"
        );
      },

      onWebSocketClose: (evt) => {
        console.warn("[STOMP][WARN] WebSocket closed");
        console.warn("[STOMP][WARN] Code:", evt.code);
        console.warn("[STOMP][WARN] Reason:", evt.reason || "none");

        if (!finished) {
          console.warn(
            "[STOMP][WARN] Socket closed before request finished. This can cause empty pages and timeouts."
          );
        }
      },

      onDisconnect: () => {
        console.log("[STOMP] Client disconnected");
      },
    });

    console.log("[STOMP] Activating client...");
    client.activate();
  });
}
