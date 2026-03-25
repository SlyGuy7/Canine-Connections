import React, { useState, useEffect } from "react";
import "../index.css";
import { sendMessage } from "../services/messaging";

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");

  const userEmail = localStorage.getItem("userEmail");

  const fallbackConversations = [
    {
      id: 1,
      name: "Happy Tails Rescue",
      time: "2 min ago",
      messages: [
        { sender: "them", text: "We would love to schedule a meet and greet for Buddy." },
        { sender: "me", text: "That sounds great. What times are available?" },
      ],
    },
    {
      id: 2,
      name: "Safe Haven Dogs",
      time: "1 hour ago",
      messages: [
        { sender: "them", text: "Your application for Luna is under review." },
      ],
    },
    {
      id: 3,
      name: "Paws & Homes",
      time: "Yesterday",
      messages: [
        { sender: "them", text: "Max is still available. Let us know if you're interested." },
      ],
    },
  ];

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const result = await sendMessage("request.messages.get", {
        email: userEmail,
      });

      console.log("messages result:", result);
      console.log("conversations:", result.conversations);

      if (result.success && result.conversations && result.conversations.length > 0) {
        setConversations(result.conversations);
        setSelectedConversation(result.conversations[0]);
      } else {
        setConversations(fallbackConversations);
        setSelectedConversation(fallbackConversations[0]);
      }
    } catch (err) {
      console.log("Failed to load messages", err);
      setConversations(fallbackConversations);
      setSelectedConversation(fallbackConversations[0]);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const result = await sendMessage("request.messages.send", {
        email: userEmail,
        conversationId: selectedConversation.id,
        message: newMessage,
      });

      console.log("send result:", result);

      if (result.success) {
        const updatedConversation = {
          ...selectedConversation,
          messages: [
            ...(selectedConversation.messages || []),
            { sender: "me", text: newMessage },
          ],
        };

        setSelectedConversation(updatedConversation);

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === updatedConversation.id ? updatedConversation : conv
          )
        );

        setNewMessage("");
      }
    } catch (err) {
      console.log("Send failed", err);
    }
  }

  return (
    <div className="messages-container">
      <div className="messages-sidebar">
        <h2>Messages</h2>

        {conversations.length === 0 ? (
          <p>No conversations found.</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                selectedConversation?.id === conv.id ? "active-conversation" : ""
              }`}
              onClick={() => setSelectedConversation(conv)}
            >
              <h4>{conv.name}</h4>
              <p>{conv.messages?.[conv.messages.length - 1]?.text || "No messages yet"}</p>
              <span>{conv.time || ""}</span>
            </div>
          ))
        )}
      </div>

      <div className="messages-chat">
        <div className="chat-header">
          <h3>{selectedConversation?.name || "Select a conversation"}</h3>
        </div>

        <div className="chat-body">
          {selectedConversation?.messages?.length ? (
            selectedConversation.messages.map((msg, index) => (
              <div
                key={index}
                className={msg.sender === "me" ? "chat-message me" : "chat-message them"}
              >
                {msg.text}
              </div>
            ))
          ) : (
            <p>No messages yet.</p>
          )}
        </div>

        <div className="chat-input">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
}