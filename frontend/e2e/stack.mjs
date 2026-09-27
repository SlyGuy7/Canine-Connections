// End-to-end check of the full Docker stack (docker compose up), talking to it the way the
// browser does: STOMP over WebSocket as the restricted web user. Run from frontend/:
//   node e2e/stack.mjs [http://localhost:8080]
import { Client } from "@stomp/stompjs";
import { randomUUID } from "node:crypto";

const BASE = process.argv[2] || "http://localhost:8080";
const WS = BASE.replace(/^http/, "ws") + "/ws";
const LOGIN = { login: "canine_web", passcode: "canine-dev-web", host: "/" };

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  -> ${detail}`}`);
  if (!ok) failures++;
}

function connect() {
  return new Promise((resolve, reject) => {
    const client = new Client({
      brokerURL: WS, connectHeaders: LOGIN, reconnectDelay: 0, debug: () => {},
      onConnect: () => resolve(client),
      onStompError: (f) => reject(new Error(f.headers.message)),
      onWebSocketError: () => reject(new Error(`cannot open ${WS}`)),
    });
    client.activate();
  });
}

// Same protocol as frontend/src/services/messaging.js.
function request(client, type, payload = {}, token = null) {
  return new Promise((resolve) => {
    const corr = `req_${randomUUID()}`;
    const replyTo = `/queue/reply.${type}.${corr}`;
    const timer = setTimeout(() => resolve({ success: false, error: "timeout" }), 30000);
    client.watchForReceipt(`sub-${corr}`, () => client.publish({
      destination: `/exchange/canine.requests/${type}`,
      headers: { "correlation-id": corr, "reply-to": replyTo },
      body: JSON.stringify({ ...payload, _token: token }),
    }));
    const sub = client.subscribe(replyTo, (msg) => {
      clearTimeout(timer); sub.unsubscribe(); resolve(JSON.parse(msg.body));
    }, { receipt: `sub-${corr}`, "x-expires": "60000" });
  });
}

// Workers may still be starting when the stack reports healthy; retry the first request.
async function firstDogs(client) {
  for (let i = 0; i < 20; i++) {
    const r = await request(client, "request.dogs.list", { limit: 100 });
    if (r.success) return r;
    await new Promise((res) => setTimeout(res, 3000));
  }
  return { success: false, error: "workers never answered" };
}

const page = await fetch(BASE + "/").then((r) => r.text()).catch((e) => String(e));
check("site is served", page.includes("Canine Connections"), page.slice(0, 120));

const client = await connect();
check("browser user can connect over /ws", true);

const dogs = await firstDogs(client);
check("dog list comes back from MySQL", dogs.success && dogs.dogs?.length === 23, JSON.stringify(dogs).slice(0, 200));

const bad = await request(client, "request.auth.login", { email: "demo@canineconnections.org", password: "wrong-password", clientIp: "e2e" });
check("wrong password is rejected", bad.success === false && /Invalid email or password/.test(bad.error), JSON.stringify(bad));

const login = await request(client, "request.auth.login", { email: "demo@canineconnections.org", password: "demo1234", clientIp: "e2e" });
check("demo account logs in and gets a session token", login.success && typeof login.token === "string", JSON.stringify(login).slice(0, 200));

const anon = await request(client, "request.saved_dogs.list", {});
check("protected request without a token is refused", anon.code === "auth_required", JSON.stringify(anon));

const saved = await request(client, "request.saved_dogs.add", { user_id: 999, dog_id: 5 }, login.token);
const list = await request(client, "request.saved_dogs.list", {}, login.token);
check("saving a dog works for the logged-in user", saved.success && list.dogs?.some((d) => Number(d.dog_id) === 5), JSON.stringify(list).slice(0, 200));

const forbidden = await request(client, "request.application.approve", { application_id: 1 }, login.token);
check("adopter cannot approve applications", forbidden.code === "forbidden", JSON.stringify(forbidden));

const admin = await request(client, "request.auth.login", { email: "admin@canineconnections.org", password: "admin1234", clientIp: "e2e-admin" });
const stories = await request(client, "request.stories.list", { limit: 50 }, admin.token);
check("admin sees pending stories", stories.success && stories.stories?.some((s) => s.status === "pending"), JSON.stringify(stories).slice(0, 200));

const quiz = await request(client, "request.quiz.questions", {});
check("quiz questions load", quiz.success && quiz.questions?.length === 5, JSON.stringify(quiz).slice(0, 200));

await client.deactivate();

// The browser account must not reach internal queues directly.
const intruder = await connect();
const refused = await new Promise((resolve) => {
  intruder.onStompError = (f) => resolve(f.headers.message || "error");
  intruder.onWebSocketClose = () => resolve("closed");
  intruder.publish({ destination: "/queue/db.account.delete", body: JSON.stringify({ user_id: 1 }) });
  setTimeout(() => resolve(null), 5000);
});
check("browser user cannot publish to db.* queues", refused !== null, "publish was accepted");
await intruder.deactivate();

const users = await (async () => {
  const c = await connect();
  const r = await request(c, "request.auth.login", { email: "demo@canineconnections.org", password: "demo1234", clientIp: "e2e-3" });
  await c.deactivate();
  return r;
})();
check("demo account still exists (nothing was deleted)", users.success === true, JSON.stringify(users).slice(0, 120));

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
