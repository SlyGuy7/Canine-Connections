// Core messaging service — all backend communication goes through this file.
// Uses STOMP over WebSocket to talk to RabbitMQ. Every call is request/reply:
// sendMessage publishes to a named queue and waits on a unique per-request reply queue.
import { Client } from "@stomp/stompjs";

// Derive the WebSocket URL automatically from the current page origin.
// In dev, Vite proxies /ws to the live RabbitMQ broker (see vite.config.js).
const BROKER_URL =
  import.meta.env.VITE_MESSAGING_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

// RabbitMQ STOMP credentials from .env.
const MQ_LOGIN    = import.meta.env.VITE_MQ_LOGIN    || "";
const MQ_PASSCODE = import.meta.env.VITE_MQ_PASSCODE || "";

// How long to wait for a reply before giving up and returning an error.
const REQUEST_TIMEOUT_MS = 60000;

// ── Persistent singleton client ──────────────────────────────────────────────
// A single STOMP client is shared across the entire app lifetime.
// This avoids re-connecting on every sendMessage call and lets the broker
// automatically reconnect if the WebSocket drops.

let _client = null;
let _connected = false;
let _connectPromise = null; // Cached so concurrent callers share the same connect attempt.

// Returns a promise that resolves to the connected STOMP client.
// If a connection is already in progress, the existing promise is returned
// so multiple callers don't open duplicate connections.
function getClient() {
  if (_connectPromise) return _connectPromise;

  _connectPromise = new Promise((resolve, reject) => {
    const client = new Client({
      brokerURL: BROKER_URL,
      connectHeaders: { login: MQ_LOGIN, passcode: MQ_PASSCODE, host: "/" },
      reconnectDelay: 3000, // Automatically retry connection every 3 seconds after a drop.
      debug: () => {},      // Suppress verbose STOMP debug output.

      onConnect: () => {
        _connected = true;
        console.log("%c[MQ] connected", "color:#16a34a;font-weight:700", BROKER_URL);
        resolve(client);
      },

      onStompError: (frame) => {
        console.error("[MQ] broker error:", frame.headers["message"], frame);
        if (!_connected) reject(new Error("STOMP connection failed"));
      },

      onWebSocketError: (evt) => {
        console.error("[MQ] WebSocket error", evt);
        if (!_connected) reject(new Error("WebSocket error"));
      },

      // Reset singleton state so the next sendMessage call triggers a fresh connect.
      onDisconnect: () => {
        _connected = false;
        _connectPromise = null;
        _client = null;
        console.warn("[MQ] disconnected — reconnecting…");
      },
    });

    _client = client;
    client.activate();
  });

  return _connectPromise;
}

// Requests are published to this exchange; the backend binds each request.* queue to it.
// The browser's RabbitMQ user may only write here and read reply.* queues
// (see infra/rabbitmq/setup_web_user.sh), so it can never reach internal bridge.* / db.* queues.
const REQUEST_EXCHANGE = "canine.requests";

// Generates a unique, unguessable correlation ID used to match each reply to its originating request.
function makeCorrelationId() {
  return `req_${crypto.randomUUID()}`;
}

// Publishes a message to the given queue and returns a promise that resolves with the response.
// Flow:
//   1. Subscribe to a unique reply queue (reply.<type>.<correlationId>).
//   2. Publish the message with correlation-id and reply-to headers.
//   3. The backend worker reads the message, processes it, and publishes the result to replyQueue.
//   4. Our subscription receives it and resolves the promise.
//   5. A 60-second timeout resolves with an error if no reply arrives.
export async function sendMessage(type, payload) {
  console.log(`%c[MQ →] ${type}`, "color:#b45309;font-weight:600", payload);
  const client = await getClient();

  return new Promise((resolve) => {
    const correlationId    = makeCorrelationId();
    const replyQueue       = `reply.${type}.${correlationId}`;
    const replyDestination = `/queue/${replyQueue}`;
    const receiptId        = `sub-${correlationId}`; // Used to confirm the subscription is active before publishing.

    let finished = false;
    let subscription = null;

    // Centralised cleanup — unsubscribes, clears the timeout, and resolves exactly once.
    function cleanup(result) {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      try { subscription?.unsubscribe(); } catch {}
      resolve(result);
    }

    // If no reply arrives within the timeout, the worker is likely down or the queue name is wrong.
    const timeoutId = setTimeout(() => {
      console.error(`[MQ] ✖ TIMEOUT — no response for "${type}" after ${REQUEST_TIMEOUT_MS / 1000}s. Worker may be down.`);
      cleanup({ success: false, error: "Request timed out" });
    }, REQUEST_TIMEOUT_MS);

    // watchForReceipt ensures the reply subscription is confirmed by the broker before we publish,
    // eliminating the race condition where the reply arrives before we are subscribed.
    client.watchForReceipt(receiptId, () => {
      client.publish({
        destination: `/exchange/${REQUEST_EXCHANGE}/${type}`,
        headers: { "correlation-id": correlationId, "reply-to": replyDestination },
        body: JSON.stringify(payload),
      });
    });

    // Subscribe to the unique reply queue. x-expires auto-deletes the queue after the timeout.
    subscription = client.subscribe(
      replyDestination,
      (message) => {
        try {
          const result = JSON.parse(message.body);
          if (result?.success === false) {
            console.warn(`%c[MQ ←] ${type} FAILED`, "color:#b45309;font-weight:600", result?.error ?? result);
          } else {
            console.log(`%c[MQ ←] ${type}`, "color:#16a34a;font-weight:600", result);
          }
          cleanup(result);
        } catch {
          console.error(`[MQ] ← ${type} invalid JSON`, message.body);
          cleanup({ success: false, error: "Invalid JSON response" });
        }
      },
      { receipt: receiptId, "x-expires": String(REQUEST_TIMEOUT_MS) }
    );
  });
}
