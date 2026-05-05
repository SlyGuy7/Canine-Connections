import { Client } from "@stomp/stompjs";

const BROKER_URL =
  import.meta.env.VITE_MESSAGING_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

const MQ_LOGIN    = import.meta.env.VITE_MQ_LOGIN    || "admin";
const MQ_PASSCODE = import.meta.env.VITE_MQ_PASSCODE || "REDACTED";

const REQUEST_TIMEOUT_MS = 60000;

// ── Persistent singleton client ──────────────────────────────────────────────

let _client = null;
let _connected = false;
let _connectPromise = null;
const _pendingCallbacks = new Map(); // correlationId → { resolve, timeoutId }

function getClient() {
  if (_connectPromise) return _connectPromise;

  _connectPromise = new Promise((resolve, reject) => {
    const client = new Client({
      brokerURL: BROKER_URL,
      connectHeaders: { login: MQ_LOGIN, passcode: MQ_PASSCODE, host: "/" },
      reconnectDelay: 3000,
      debug: () => {},

      onConnect: () => {
        _connected = true;
        resolve(client);
      },

      onStompError: (frame) => {
        console.error("[STOMP] broker error:", frame.headers["message"]);
        if (!_connected) reject(new Error("STOMP connection failed"));
      },

      onWebSocketError: (evt) => {
        console.error("[STOMP] WebSocket error", evt);
        if (!_connected) reject(new Error("WebSocket error"));
      },

      onDisconnect: () => {
        _connected = false;
        _connectPromise = null;
        _client = null;
      },
    });

    _client = client;
    client.activate();
  });

  return _connectPromise;
}

function makeCorrelationId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function sendMessage(type, payload) {
  const client = await getClient();

  return new Promise((resolve) => {
    const correlationId    = makeCorrelationId();
    const replyQueue       = `${type}.reply.${correlationId}`;
    const replyDestination = `/queue/${replyQueue}`;
    const receiptId        = `sub-${correlationId}`;

    let finished = false;
    let subscription = null;

    function cleanup(result) {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      try { subscription?.unsubscribe(); } catch {}
      resolve(result);
    }

    const timeoutId = setTimeout(() => {
      console.error(`[STOMP] timeout for ${type}`);
      cleanup({ success: false, error: "Request timed out" });
    }, REQUEST_TIMEOUT_MS);

    client.watchForReceipt(receiptId, () => {
      client.publish({
        destination: `/queue/${type}`,
        headers: { "correlation-id": correlationId, "reply-to": replyDestination },
        body: JSON.stringify(payload),
      });
    });

    subscription = client.subscribe(
      replyDestination,
      (message) => {
        try {
          cleanup(JSON.parse(message.body));
        } catch {
          cleanup({ success: false, error: "Invalid JSON response" });
        }
      },
      { receipt: receiptId, "x-expires": String(REQUEST_TIMEOUT_MS) }
    );
  });
}
