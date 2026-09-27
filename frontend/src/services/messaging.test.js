import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the STOMP client: connects immediately, records publishes, and lets a
// test deliver the reply for the most recent request.
const broker = vi.hoisted(() => ({ published: [], subscriptions: [], reply: null }));

vi.mock("@stomp/stompjs", () => ({
  Client: class {
    constructor(config) { this.config = config; this.receipts = {}; }
    activate() { this.config.onConnect(); }
    watchForReceipt(id, callback) { this.receipts[id] = callback; }
    publish(frame) { broker.published.push(frame); }
    subscribe(destination, handler, headers) {
      broker.subscriptions.push({ destination, headers });
      broker.reply = (payload) => handler({ body: JSON.stringify(payload) });
      this.receipts[headers.receipt]();   // the broker confirms the subscription, then we publish
      return { unsubscribe() {} };
    }
  },
}));

async function freshMessaging() {
  vi.resetModules();
  return import("./messaging");
}

beforeEach(() => {
  broker.published = [];
  broker.subscriptions = [];
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  window.history.pushState({}, "", "/dashboard");
});

describe("sendMessage", () => {
  it("publishes to the request exchange with the session token and resolves with the reply", async () => {
    localStorage.setItem("authToken", "user-token");
    const { sendMessage } = await freshMessaging();

    const pending = sendMessage("request.saved_dogs.add", { dog_id: 3 });
    await vi.waitFor(() => expect(broker.published).toHaveLength(1));

    const frame = broker.published[0];
    expect(frame.destination).toBe("/exchange/canine.requests/request.saved_dogs.add");
    expect(JSON.parse(frame.body)).toEqual({ dog_id: 3, _token: "user-token" });

    // Replies come back on a private reply.* queue named after an unguessable correlation id.
    const replyTo = frame.headers["reply-to"];
    expect(replyTo).toMatch(/^\/queue\/reply\.request\.saved_dogs\.add\.req_[0-9a-f-]{36}$/);
    expect(broker.subscriptions[0].destination).toBe(replyTo);

    broker.reply({ success: true });
    await expect(pending).resolves.toEqual({ success: true });
  });

  it("sends the admin token from admin pages", async () => {
    localStorage.setItem("authToken", "user-token");
    localStorage.setItem("adminAuthToken", "admin-token");
    window.history.pushState({}, "", "/admin/dogs");
    const { sendMessage } = await freshMessaging();

    sendMessage("request.api.dog.upsert", {});
    await vi.waitFor(() => expect(broker.published).toHaveLength(1));

    expect(JSON.parse(broker.published[0].body)._token).toBe("admin-token");
  });

  it("never prints passwords or ID images to the console", async () => {
    const { sendMessage } = await freshMessaging();

    sendMessage("request.auth.register", { email: "a@b.c", password: "hunter22", id_one_b64: "AAAA" });
    await vi.waitFor(() => expect(broker.published).toHaveLength(1));

    const printed = JSON.stringify(console.log.mock.calls);
    expect(printed).not.toContain("hunter22");
    expect(printed).not.toContain("AAAA");
    expect(printed).toContain("a@b.c");
  });

  it("leaves logged-out visitors where they are when a request needs an account", async () => {
    localStorage.setItem("canine_theme", "dark");
    window.history.pushState({}, "", "/dogs/3");
    const { sendMessage } = await freshMessaging();

    const pending = sendMessage("request.saved_dogs.list", {});
    await vi.waitFor(() => expect(broker.published).toHaveLength(1));
    broker.reply({ success: false, code: "auth_required", error: "Please log in to continue." });

    await expect(pending).resolves.toMatchObject({ code: "auth_required" });
    expect(window.location.pathname).toBe("/dogs/3");
    expect(localStorage.getItem("canine_theme")).toBe("dark");
  });

  it("logs the user out when the backend rejects the session", async () => {
    localStorage.setItem("authToken", "expired-token");
    localStorage.setItem("userId", "5");
    localStorage.setItem("canine_theme", "dark");
    const { sendMessage } = await freshMessaging();

    const pending = sendMessage("request.saved_dogs.list", {});
    await vi.waitFor(() => expect(broker.published).toHaveLength(1));
    broker.reply({ success: false, code: "auth_required", error: "Please log in to continue." });

    await expect(pending).resolves.toMatchObject({ code: "auth_required" });
    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("userId")).toBeNull();
    expect(localStorage.getItem("canine_theme")).toBe("dark");
  });
});
