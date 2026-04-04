import { Client } from "@stomp/stompjs";
console.log("Messaging URL:", import.meta.env.VITE_MESSAGING_URL);
const BROKER_URL = import.meta.env.VITE_MESSAGING_URL || "ws://localhost:15674/ws"; 
function getResponseQueue(type) {
  switch (type) {
    case "request.auth.register": return "response.auth.register";
    case "request.auth.login": return "response.auth.login";
    case "request.auth.resetPassword": return "response.auth.resetPassword";
    case "request.profile.update": return "response.profile.update";
    case "request.dogs.list": return "response.dogs.list";
    case "request.dogs.get": return "response.dogs.get";
    case "request.applications.get": return "response.applications.get";
    case "request.applications.submit": return "response.applications.submit";
    
    case "request.messages.get": return "response.messages.get";
    case "request.messages.send": return "response.messages.send";
    
    default: return "";
  }
}
function makeCorrelationId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
export async function sendMessage(type, payload) {
  return new Promise((resolve) => {
    const responseQueue = getResponseQueue(type);
    
    if (!responseQueue) {
      console.warn(`[STOMP] Unknown message type attempted: ${type}`);
      resolve({ success: false, error: `Unknown message type: ${type}` });
      return;
    }
    const correlationId = makeCorrelationId();
    let isResolved = false;
    const client = new Client({
      brokerURL: BROKER_URL,
      connectHeaders: {
        login: "admin",      
        passcode: "REDACTED",
        host: "/"
      },
      reconnectDelay: 0,
      debug: (str) => console.log("[STOMP Debug]:", str),
      
      onConnect: () => {
        let finished = false;
        
        const subscription = client.subscribe(`/queue/${responseQueue}`, (message) => {
          const messageCorrelationId = message.headers["correlation-id"] || message.headers["correlation_id"];
          
          if (messageCorrelationId !== correlationId || finished) {
            return;
          }
          
          finished = true;
          isResolved = true;
          
          try {
            const data = JSON.parse(message.body);
            cleanup(data);
          } catch (error) {
            cleanup({ success: false, error: "Invalid response from RabbitMQ" });
          }
        });
        client.publish({
          destination: `/queue/${type}`,
          headers: {
            "correlation-id": correlationId,
          },
          body: JSON.stringify(payload),
        });
        setTimeout(() => {
          if (!finished) {
            finished = true;
            isResolved = true;
            console.warn(`[STOMP] Request timed out for: ${type}`);
            cleanup({ success: false, error: "Request timed out" });
          }
        }, 30000);
        function cleanup(resultData) {
            subscription.unsubscribe();
            client.deactivate();
            resolve(resultData);
        }
      },
      
      onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers['message']);
        if (!isResolved) resolve({ success: false, error: "RabbitMQ STOMP error" });
      },
      
      onWebSocketError: (evt) => {
        console.error("WebSocket Error:", evt);
        if (!isResolved) resolve({ success: false, error: "RabbitMQ WebSocket error" });
      },
    });
    client.activate();
  });
}