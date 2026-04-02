import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { sendMessage } from "../services/messaging";

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  const userEmail = localStorage.getItem("userEmail");

  const fallbackConversations = [
    {
      id: 1,
      name: "Happy Tails Rescue",
      time: "2 min ago",
      messages: [
        { sender: "them", text: "We would love to schedule a meet and greet for Buddy." },
        { sender: "me", text: "Sounds great. What times are available?" },
      ],
    },
    {
      id: 2,
      name: "Safe Haven Dogs",
      time: "1 hour ago",
      messages: [{ sender: "them", text: "Your application for Luna is under review." }],
    },
  ];

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  async function loadConversations() {
    try {
      const result = await sendMessage("request.messages.get", { email: userEmail });
      const loadedConvos = (result.success && result.conversations?.length) 
        ? result.conversations 
        : fallbackConversations;

      setConversations(loadedConvos);
      
      const shelterQuery = searchParams.get("shelter");
      const target = shelterQuery 
        ? loadedConvos.find(c => c.name.toLowerCase() === shelterQuery.toLowerCase())
        : loadedConvos[0];
        
      setSelectedConversation(target || loadedConvos[0]);
    } catch (err) {
      setConversations(fallbackConversations);
      setSelectedConversation(fallbackConversations[0]);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedConversation) return;

    const text = newMessage;
    setNewMessage("");

    const updated = {
      ...selectedConversation,
      messages: [...(selectedConversation.messages || []), { sender: "me", text }],
    };

    setSelectedConversation(updated);
    setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));

    try {
      await sendMessage("request.messages.send", {
        email: userEmail,
        conversationId: selectedConversation.id,
        message: text,
      });
    } catch (err) {
      console.error("Failed to sync message to server.");
    }
  }

  return (
    <div className="page-container">
      <header className="content-header">
        <div>
          <h1>Messages</h1>
          <p className="page-subtitle">Direct communication with shelter partners.</p>
        </div>
      </header>

      <div className="messenger-container">
        <aside className="messenger-sidebar">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
              onClick={() => setSelectedConversation(conv)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="form-label">{conv.name}</span>
                <span className="page-subtitle" style={{ fontSize: '11px' }}>{conv.time}</span>
              </div>
              <p className="page-subtitle" style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {conv.messages?.[conv.messages.length - 1]?.text || "No messages"}
              </p>
            </div>
          ))}
        </aside>

        <main className="chat-main">
          <div className="chat-header" style={{ padding: '20px', background: 'white', borderBottom: '1px solid var(--border-main)' }}>
            <h3 className="form-label" style={{ fontSize: '18px' }}>{selectedConversation?.name}</h3>
          </div>

          <div className="chat-body">
            {selectedConversation?.messages?.map((msg, i) => (
              <div key={i} className={`message-bubble ${msg.sender === 'me' ? 'message-me' : 'message-them'}`}>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              className="form-input"
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button className="btn btn-primary" onClick={handleSend}>Send</button>
          </div>
        </main>
      </div>
    </div>
  );
}