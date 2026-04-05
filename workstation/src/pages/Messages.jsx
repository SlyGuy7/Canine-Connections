import React, { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function Messages() {
  // 1. Define our list of shelters (contacts)
  const [contacts] = useState([
    { id: 1, name: "Happy Tails Rescue", lastSeen: "Active now", avatar: "🏡" },
    { id: 2, name: "City Animal Shelter", lastSeen: "Active 2h ago", avatar: "🏢" },
    { id: 3, name: "Paws & Hearts", lastSeen: "Active 4h ago", avatar: "🐾" }
  ]);

  // 2. Track which conversation is currently open
  const [activeContactId, setActiveContactId] = useState(1);
  const [newMessage, setNewMessage] = useState("");

  // 3. Store messages by contact ID
  const [messages, setMessages] = useState({
    1: [
      { id: 101, sender: "shelter", text: "Hi John, we saw you saved Buddy! Are you interested in setting up a meet and greet this weekend?" },
      { id: 102, sender: "user", text: "Yes, I would love to! What days are you open?" },
      { id: 103, sender: "shelter", text: "We are open Saturday and Sunday from 10 AM to 4 PM. Does Saturday at noon work for you?" }
    ],
    2: [
      { id: 201, sender: "shelter", text: "Hello! Just wanted to let you know your application for Max has been received and is under review." },
      { id: 202, sender: "user", text: "That is amazing news, thank you! Let me know if you need anything else." }
    ],
    3: [
      { id: 301, sender: "user", text: "Do you have any more photos of Bella?" },
      { id: 302, sender: "shelter", text: "Absolutely, I will upload some new ones to her profile this afternoon." }
    ]
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: "user",
      text: newMessage
    };

    setMessages(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMsg]
    }));
    setNewMessage("");
  };

  const activeContact = contacts.find(c => c.id === activeContactId);
  const currentMessages = messages[activeContactId] || [];

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header className="content-header" style={{ marginBottom: '30px' }}>
          <h1>Messages</h1>
          <p className="dashboard-subtitle">Manage your conversations with rescue partners.</p>
        </header>

        <div style={{ 
          display: 'flex', 
          height: '600px', 
          background: 'white', 
          borderRadius: '20px', 
          border: '1px solid #efdfd1', 
          overflow: 'hidden',
          boxShadow: '0 4px 15px rgba(60, 35, 20, 0.05)'
        }}>
       
          <div style={{ 
            width: '320px', 
            borderRight: '1px solid #efdfd1', 
            background: 'white',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #efdfd1', background: '#fffaf5' }}>
              <h3 style={{ margin: 0, color: '#2f241d' }}>Shelters</h3>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {contacts.map((contact) => (
                <div 
                  key={contact.id}
                  onClick={() => setActiveContactId(contact.id)}
                  style={{
                    padding: '20px',
                    borderBottom: '1px solid #f9f2ec',
                    cursor: 'pointer',
                    background: activeContactId === contact.id ? '#fcedda' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ fontSize: '24px', background: 'white', padding: '10px', borderRadius: '50%', border: '1px solid #efdfd1' }}>
                    {contact.avatar}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: '#2f241d', fontSize: '15px' }}>{contact.name}</h4>
                    <p style={{ margin: 0, color: '#6f5848', fontSize: '13px' }}>
                      {messages[contact.id]?.slice(-1)[0]?.text.substring(0, 30)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ 
              padding: '20px', 
              borderBottom: '1px solid #efdfd1', 
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#2f241d' }}>{activeContact?.name}</h3>
                <span style={{ fontSize: '13px', color: '#d97706' }}>● {activeContact?.lastSeen}</span>
              </div>
            </div>

            <div style={{ 
              flex: 1, 
              padding: '20px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '15px', 
              background: '#fffaf5' 
            }}>
              {currentMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  style={{
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    background: msg.sender === "user" ? "#d97706" : "white",
                    color: msg.sender === "user" ? "white" : "#2f241d",
                    padding: "12px 18px",
                    borderRadius: "20px",
                    border: msg.sender === "user" ? "none" : "1px solid #dcc8b7",
                    maxWidth: "70%",
                    fontSize: "15px",
                    lineHeight: "1.4",
                    boxShadow: msg.sender === "user" ? "0 2px 5px rgba(217, 119, 6, 0.2)" : "0 2px 5px rgba(60, 35, 20, 0.05)"
                  }}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Input Area */}
            <form 
              onSubmit={handleSend} 
              style={{ 
                padding: '20px', 
                borderTop: '1px solid #efdfd1', 
                display: 'flex', 
                gap: '10px', 
                background: 'white' 
              }}
            >
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                style={{ 
                  flex: 1, 
                  padding: '15px', 
                  borderRadius: '12px', 
                  border: '1px solid #dcc8b7', 
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <button 
                type="submit"
                style={{
                  background: '#d97706',
                  color: 'white',
                  border: 'none',
                  padding: '0 25px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Send
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}