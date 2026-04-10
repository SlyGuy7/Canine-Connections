import React, { useState, useEffect } from "react";
import { sendMessage } from "../services/messaging";

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [adoptedDogs, setAdoptedDogs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newEntry, setNewEntry] = useState({ 
    id: null,
    dogName: "", 
    title: "", 
    content: "", 
    date: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => {
    loadAdoptions();
    const saved = JSON.parse(localStorage.getItem("journal_entries") || "[]");
    setEntries(saved);
  }, []);

  async function loadAdoptions() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    try {
      const result = await sendMessage("request.adoptions.list", { user_id: parseInt(userId) });
      if (result?.success) setAdoptedDogs(result.adoptions || []);
    } catch (err) {
      console.error("Failed to load dogs", err);
    }
  }

  const handleSave = (e) => {
    e.preventDefault();
    let updatedEntries;

    if (editingId) {
      updatedEntries = entries.map(emp => emp.id === editingId ? { ...newEntry } : emp);
    } else {
      const entryToAdd = { ...newEntry, id: Date.now() };
      updatedEntries = [entryToAdd, ...entries];
    }

    saveAndClose(updatedEntries);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this entry? This cannot be undone.")) {
      const updatedEntries = entries.filter(entry => entry.id !== id);
      saveAndClose(updatedEntries);
    }
  };

  const saveAndClose = (updatedEntries) => {
    setEntries(updatedEntries);
    localStorage.setItem("journal_entries", JSON.stringify(updatedEntries));
    closeModal();
  };

  const startEdit = (entry) => {
    setNewEntry(entry);
    setEditingId(entry.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setNewEntry({ id: null, dogName: "", title: "", content: "", date: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setIsModalOpen(false);
  };

  return (
    <div className="page-container" style={{ backgroundColor: '#fffaf5', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: '#2f241d', margin: 0 }}>Pet Journal</h1>
            <p style={{ color: '#6f5848', margin: '4px 0 0 0' }}>Manage memories for your furry family.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ padding: '12px 24px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            + Add Entry
          </button>
        </header>

        {entries.length === 0 ? (
          <div style={{ background: 'white', padding: '80px 20px', borderRadius: '24px', textAlign: 'center', border: '2px dashed #e5d5c5' }}>
            <div style={{ fontSize: '50px', marginBottom: '16px' }}>📖</div>
            <h2 style={{ color: '#2f241d' }}>No Memories Yet</h2>
            <button onClick={() => setIsModalOpen(true)} style={{ padding: '12px 30px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}>
              Create First Entry
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {entries.map((entry) => (
              <div key={entry.id} style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #efdfd1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d97706', textTransform: 'uppercase' }}>{entry.dogName || "General"}</span>
                  <span style={{ color: '#a8a29e', fontSize: '13px' }}>{new Date(entry.date).toLocaleDateString()}</span>
                </div>
                <h3 style={{ margin: '0 0 10px 0', color: '#2f241d' }}>{entry.title}</h3>
                <p style={{ margin: '0 0 20px 0', color: '#6f5848', lineHeight: '1.6' }}>{entry.content}</p>
                
                <div style={{ display: 'flex', gap: '20px' }}>
                  <button 
                    onClick={() => startEdit(entry)}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '14px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(entry.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '14px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(47, 36, 29, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '550px', borderRadius: '20px', padding: '32px' }}>
            <h2 style={{ marginTop: 0, color: '#2f241d', marginBottom: '24px' }}>{editingId ? "Edit Entry" : "New Journal Entry"}</h2>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#4a382d' }}>Select Dog</label>
                <select 
                  value={newEntry.dogName}
                  onChange={(e) => setNewEntry({...newEntry, dogName: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dcc8b7' }}
                  required
                >
                  <option value="">Choose a pet...</option>
                  {adoptedDogs.map(dog => (
                    <option key={dog.dog_id} value={dog.dog_name}>{dog.dog_name}</option>
                  ))}
                  <option value="General">General Note</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#4a382d' }}>Title</label>
                <input 
                  type="text" 
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dcc8b7', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#4a382d' }}>Notes</label>
                <textarea 
                  rows="5"
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dcc8b7', resize: 'none', boxSizing: 'border-box' }}
                  required
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={closeModal} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7', background: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  {editingId ? "Update Entry" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}