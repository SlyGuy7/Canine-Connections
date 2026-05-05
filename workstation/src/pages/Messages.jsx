import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";

const AVATAR_COLORS = ["#d97706", "#059669", "#7c3aed", "#db2777", "#0891b2"];

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Messages() {
  const userId   = localStorage.getItem("userId");
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [sessions, setSessions]           = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [activeShelter, setActiveShelter] = useState(null);
  const [sessionId, setSessionId]         = useState(null);
  const [messages, setMessages]           = useState([]);
  const [chatLoading, setChatLoading]     = useState(false);
  const [newMessage, setNewMessage]       = useState("");
  const [sending, setSending]             = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  // Handle "Message Shelter" button from ShelterDetails
  useEffect(() => {
    if (location.state?.shelterId && location.state?.shelter) {
      openShelterChat(location.state.shelter);
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const result = await sendMessage("request.chat.sessions", { user_id: parseInt(userId) });
      if (result?.success) setSessions(result.sessions || []);
    } catch {
      addToast("Could not load conversations.", "error");
    } finally {
      setSessionsLoading(false);
    }
  }

  async function openShelterChat(shelter) {
    setActiveShelter(shelter);
    setChatLoading(true);
    setMessages([]);
    setSessionId(null);
    try {
      const startResult = await sendMessage("request.chat.start", {
        user_id: parseInt(userId),
        shelter_id: parseInt(shelter.shelter_id),
        dog_id: null,
      });
      if (startResult?.success && startResult.session_id) {
        const sid = startResult.session_id;
        setSessionId(sid);
        const histResult = await sendMessage("request.chat.history", {
          session_id: sid,
          user_id: parseInt(userId),
        });
        if (histResult?.success) setMessages(histResult.messages || []);
        // Refresh sidebar to include this shelter if new
        loadSessions();
      } else {
        addToast("Could not open chat session.", "error");
      }
    } catch {
      addToast("Connection error opening chat.", "error");
    } finally {
      setChatLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleSelectSession(session) {
    const shelter = {
      shelter_id: session.shelter_id,
      name: session.shelter_name,
      city: session.city,
      state: session.state,
      phone: session.phone,
      email: session.email,
    };
    openShelterChat(shelter);
  }

  async function handleSend(e) {
    e?.preventDefault();
    const text = newMessage.trim();
    if (!text || !sessionId || sending) return;

    const optimistic = { sender_id: parseInt(userId), message: text, created_at: new Date().toISOString(), first_name: "You", _optimistic: true };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage("");
    setSending(true);

    try {
      const result = await sendMessage("request.chat.message", {
        session_id: parseInt(sessionId),
        sender_id: parseInt(userId),
        message: text,
      });
      if (!result?.success) {
        addToast("Message failed to send.", "error");
        setMessages(prev => prev.filter(m => m !== optimistic));
      } else {
        loadSessions(); // refresh last-message preview in sidebar
      }
    } catch {
      addToast("Could not send message.", "error");
      setMessages(prev => prev.filter(m => m !== optimistic));
    } finally {
      setSending(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 40px 0", display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>

      <div style={{ marginBottom: "20px", flexShrink: 0 }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Messages</h1>
        <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>Your conversations with rescue shelters.</p>
      </div>

      <div style={{ flex: 1, display: "flex", background: "white", borderRadius: "20px", border: "1px solid #efdfd1", overflow: "hidden", boxShadow: "0 4px 24px rgba(47,36,29,0.07)", minHeight: 0 }}>

        {/* Sidebar */}
        <div style={{ width: "300px", borderRight: "1px solid #efdfd1", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #efdfd1", background: "#fffaf5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#78716c", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Conversations {!sessionsLoading && sessions.length > 0 && `· ${sessions.length}`}
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {sessionsLoading ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#a8a29e", fontSize: "14px" }}>Loading…</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ fontSize: "24px", margin: "0 0 8px" }}>💬</p>
                <p style={{ color: "#78716c", fontSize: "14px", fontWeight: "600", margin: "0 0 6px" }}>No conversations yet</p>
                <p style={{ color: "#a8a29e", fontSize: "13px", margin: "0 0 16px" }}>Visit a shelter to start chatting</p>
                <button onClick={() => navigate("/shelters")} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #efdfd1", background: "#fffaf5", color: "#d97706", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
                  Browse Shelters
                </button>
              </div>
            ) : (
              sessions.map((session, idx) => {
                const isActive    = activeShelter?.shelter_id === session.shelter_id;
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                return (
                  <div
                    key={session.session_id}
                    onClick={() => handleSelectSession(session)}
                    style={{ padding: "15px 20px", borderBottom: "1px solid #f5ede4", cursor: "pointer", background: isActive ? "#fcedda" : "white", display: "flex", alignItems: "center", gap: "12px", transition: "background 0.15s" }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#fffaf5"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "white"; }}
                  >
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: isActive ? avatarColor : "#f0e8e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: isActive ? "white" : "#78716c", flexShrink: 0 }}>
                      {getInitials(session.shelter_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px 0", fontSize: "14px", fontWeight: "600", color: "#2f241d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {session.shelter_name}
                      </p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#a8a29e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {session.last_message || [session.city, session.state].filter(Boolean).join(", ") || "No messages yet"}
                      </p>
                    </div>
                    {session.last_message_at && (
                      <span style={{ fontSize: "11px", color: "#c4a98e", flexShrink: 0 }}>{formatTime(session.last_message_at)}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat panel */}
        {!activeShelter ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", color: "#a8a29e", background: "#fffaf5" }}>
            <span style={{ fontSize: "48px" }}>💬</span>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#78716c" }}>Select a conversation</p>
            <p style={{ margin: 0, fontSize: "13px" }}>Or visit a shelter page to start a new one</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

            <div style={{ padding: "16px 24px", borderBottom: "1px solid #efdfd1", display: "flex", alignItems: "center", gap: "14px", background: "white", flexShrink: 0 }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: AVATAR_COLORS[sessions.findIndex(s => s.shelter_id === activeShelter.shelter_id) % AVATAR_COLORS.length] || AVATAR_COLORS[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "white" }}>
                {getInitials(activeShelter.name)}
              </div>
              <div>
                <h3 style={{ margin: "0 0 2px 0", fontSize: "16px", fontWeight: "700", color: "#2f241d" }}>{activeShelter.name}</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#a8a29e" }}>
                  {[activeShelter.city, activeShelter.state].filter(Boolean).join(", ")}
                  {activeShelter.phone ? ` · ${activeShelter.phone}` : ""}
                </p>
              </div>
            </div>

            <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", background: "#fffaf5" }}>
              {chatLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#a8a29e", fontSize: "14px", gap: "10px" }}>
                  <div style={{ width: "20px", height: "20px", border: "2px solid #e2d9d0", borderTopColor: "#d97706", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Loading conversation…
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", margin: "auto", color: "#a8a29e" }}>
                  <p style={{ fontSize: "32px", margin: "0 0 8px" }}>👋</p>
                  <p style={{ fontSize: "15px", fontWeight: "600", color: "#78716c", margin: "0 0 4px" }}>No messages yet</p>
                  <p style={{ fontSize: "13px", margin: 0 }}>Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser     = String(msg.sender_id) === String(userId);
                  const showAvatar = !isUser && (idx === 0 || String(messages[idx - 1]?.sender_id) === String(userId));
                  const colorIdx   = (sessions.findIndex(s => s.shelter_id === activeShelter.shelter_id) % AVATAR_COLORS.length) || 0;
                  return (
                    <div key={msg.message_id ?? idx} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                        {!isUser && (
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: showAvatar ? AVATAR_COLORS[colorIdx] : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800", color: "white", flexShrink: 0 }}>
                            {showAvatar ? getInitials(activeShelter.name) : ""}
                          </div>
                        )}
                        <div style={{ maxWidth: "65%", padding: "12px 16px", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isUser ? "#d97706" : "white", color: isUser ? "white" : "#2f241d", fontSize: "14px", lineHeight: "1.5", border: isUser ? "none" : "1px solid #e8ddd5", boxShadow: isUser ? "0 2px 8px rgba(217,119,6,0.2)" : "0 2px 6px rgba(0,0,0,0.05)", opacity: msg._optimistic ? 0.75 : 1 }}>
                          {msg.message}
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", color: "#c4a98e", marginTop: "4px", marginLeft: isUser ? 0 : "36px" }}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={{ padding: "16px 20px", borderTop: "1px solid #efdfd1", display: "flex", gap: "10px", background: "white", alignItems: "center", flexShrink: 0 }}>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
                disabled={chatLoading}
                style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2d9d0", fontSize: "14px", fontFamily: "'Inter', sans-serif", outline: "none", color: "#2f241d", background: "#fffaf5" }}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending || chatLoading || !sessionId}
                style={{ padding: "12px 22px", borderRadius: "12px", border: "none", background: newMessage.trim() && !sending && sessionId ? "#d97706" : "#e2d9d0", color: newMessage.trim() && !sending && sessionId ? "white" : "#a8a29e", fontWeight: "700", fontSize: "14px", cursor: newMessage.trim() && !sending && sessionId ? "pointer" : "default", transition: "all 0.15s", whiteSpace: "nowrap" }}
              >
                {sending ? "…" : "Send"}
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
