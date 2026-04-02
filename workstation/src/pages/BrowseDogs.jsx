import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";
import Sidebar from "../components/Sidebar";

export default function BrowseDogs() {
  const [allDogs, setAllDogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ breed: "All", size: "All", age: "All" });
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    loadDogs();
  }, []);

  async function loadDogs() {
    const fallbackDogs = [
      { id: 1, name: "Buddy", breed: "Labrador Mix", size: "Large", age: 2 },
      { id: 2, name: "Luna", breed: "Golden Retriever", size: "Large", age: 1 },
      { id: 3, name: "Max", breed: "Beagle", size: "Medium", age: 4 },
      { id: 4, name: "Bella", breed: "Pug", size: "Small", age: 3 },
      { id: 5, name: "Charlie", breed: "Poodle", size: "Medium", age: 5 },
      { id: 6, name: "Daisy", breed: "Chihuahua", size: "Small", age: 1 }
    ];

    try {
      const result = await sendMessage("request.dogs.get", {});
      if (result.success && result.dogs?.length > 0) {
        setAllDogs(result.dogs);
      } else {
        setAllDogs(fallbackDogs);
      }
    } catch (err) {
      setAllDogs(fallbackDogs);
    } finally {
      setLoading(false);
    }
  }

  // FIXED: Added backticks around the template literals
  const handleSaveDog = (dog) => {
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]");
    if (savedDogs.some((d) => d.id === dog.id)) {
      addToast(`${dog.name} is already in your Vault!`, "error");
      return;
    }
    savedDogs.push(dog);
    localStorage.setItem("savedDogs", JSON.stringify(savedDogs));
    addToast(`${dog.name} saved successfully!`, "success");
  };

  const getAgeCategory = (age) => {
    if (age <= 1) return "Puppy (0-1 yrs)";
    if (age <= 3) return "Young (2-3 yrs)";
    if (age <= 7) return "Adult (4-7 yrs)";
    return "Senior (8+ yrs)";
  };

  const filteredDogs = allDogs.filter((dog) => {
    const matchesSearch = dog.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          dog.breed.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBreed = filters.breed === "All" || dog.breed === filters.breed;
    const matchesSize = filters.size === "All" || dog.size === filters.size;
    const matchesAge = filters.age === "All" || getAgeCategory(dog.age) === filters.age;
    return matchesSearch && matchesBreed && matchesSize && matchesAge;
  });

  const uniqueBreeds = ["All", ...new Set(allDogs.map((dog) => dog.breed))];

  // FIXED: Wrapped loading state in dashboard-wrapper and page-container
  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <header className="content-header">
            <h1>Browse Available Dogs</h1>
          </header>
          <div className="dog-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-card" style={{ background: 'white', padding: '20px', borderRadius: '15px' }}>
                <div style={{ height: '150px', background: '#e0e0e0', borderRadius: '10px' }} />
                <div style={{ marginTop: '20px' }}>
                  <div style={{ height: '20px', width: '60%', background: '#e0e0e0', marginBottom: '10px' }} />
                  <div style={{ height: '20px', width: '40%', background: '#e0e0e0' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // FIXED: Wrapped main content in dashboard-wrapper and page-container
  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header className="content-header" style={{ marginBottom: '30px' }}>
          <h1>Browse Available Dogs</h1>
          <p className="dashboard-subtitle">Find your perfect match from our rescue network.</p>
        </header>

        <section className="filter-container" style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            className="form-input"
            style={{ padding: '15px', borderRadius: '12px', border: '1px solid #dcc8b7', fontSize: '16px', width: '100%', maxWidth: '500px' }}
            placeholder="Search by name or breed..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="filter-row" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <select className="form-input" value={filters.breed} onChange={(e) => setFilters({ ...filters, breed: e.target.value })}>
              {uniqueBreeds.map((breed) => (
                <option key={breed} value={breed}>{breed === "All" ? "All Breeds" : breed}</option>
              ))}
            </select>
            <select className="form-input" value={filters.size} onChange={(e) => setFilters({ ...filters, size: e.target.value })}>
              <option value="All">All Sizes</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
            </select>
            <select className="form-input" value={filters.age} onChange={(e) => setFilters({ ...filters, age: e.target.value })}>
              <option value="All">All Ages</option>
              <option value="Puppy (0-1 yrs)">Puppy (0-1 yrs)</option>
              <option value="Young (2-3 yrs)">Young (2-3 yrs)</option>
              <option value="Adult (4-7 yrs)">Adult (4-7 yrs)</option>
              <option value="Senior (8+ yrs)">Senior (8+ yrs)</option>
            </select>
          </div>
        </section>

        <div className="dog-grid">
          {filteredDogs.map((dog) => (
            <div key={dog.id} className="dog-card" style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1px solid #efdfd1' }}>
              <div style={{ height: '200px', background: '#fcedda', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '64px' }}>🐕</span>
              </div>
              <div className="dog-card-content" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#2f241d' }}>{dog.name}</h3>
                <p style={{ margin: '5px 0', color: '#6f5848' }}><strong>Breed:</strong> {dog.breed}</p>
                <p style={{ margin: '5px 0', color: '#6f5848' }}><strong>Size:</strong> {dog.size}</p>
                <p style={{ margin: '5px 0', color: '#6f5848' }}><strong>Age:</strong> {dog.age} {dog.age === 1 ? "year" : "years"}</p>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/dogs/${dog.id}`)}>
                    Details
                  </button>
                  <button 
                    className="btn" 
                    style={{ flex: 1, background: 'white', border: '1px solid #d8c1af', color: '#2f241d' }} 
                    onClick={() => handleSaveDog(dog)}
                  >
                    ❤️ Save
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}