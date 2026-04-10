import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import AuthModal from "../components/AuthModal"

function CategoryPreviewModal({ category, dogs, close, navigate }) {
  if (!category) return null;

  let previewDogs = [];
  let title = "";
  let subtitle = "";

  if (category === "Small Dogs") {
    previewDogs = dogs.filter((d) => d.size === "Small");
    title = "Little Pups, Big Hearts 🐕";
    subtitle = "These bite-sized companions are perfectly sized for any home.";
  } else if (category === "Large Dogs") {
    previewDogs = dogs.filter((d) => d.size === "Large");
    title = "Gentle Giants 🦮";
    subtitle = "Looking for a bigger companion? Meet our large breed dogs.";
  } else if (category === "Puppies") {
    previewDogs = dogs.filter((d) => d.ageGroup === "Puppy");
    title = "Playful Puppies 🐾";
    subtitle = "Young, energetic, and ready to join your family.";
  }

  if (previewDogs.length < 4 && dogs.length > 0) {
    const extraDogs = dogs.filter(d => !previewDogs.includes(d));
    previewDogs = [...previewDogs, ...extraDogs].slice(0, 4);
  } else {
    previewDogs = previewDogs.slice(0, 4);
  }

  return (
    <div className="modal-overlay" onClick={close}>
      <div
        className="modal-content"
        style={{
          width: "850px",
          padding: "40px",
          backgroundColor: "#fffaf5",
          borderRadius: "24px",
          position: "relative",
          boxShadow: "0 24px 70px rgba(0,0,0,0.28)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-x"
          onClick={close}
          style={{
            position: "absolute",
            top: "20px",
            right: "25px",
            background: "transparent",
            border: "none",
            fontSize: "30px",
            cursor: "pointer",
            color: "#2f241d"
          }}
        >
          &times;
        </button>

        <h2 style={{ marginTop: 0, color: "#2f241d", fontSize: "32px" }}>
          {title}
        </h2>
        <p style={{ color: "#6f5848", marginBottom: "30px", fontSize: "16px" }}>
          {subtitle}
        </p>

        <div style={{ display: "flex", gap: "15px", marginBottom: "35px" }}>
          {previewDogs.length > 0 ? (
            previewDogs.map((dog) => (
              <div key={dog.id} style={{ flex: 1, border: "1px solid #efdfd1", borderRadius: "16px", overflow: "hidden", textAlign: "center", background: "white", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
                {dog.image ? (
                  <img src={dog.image} alt={dog.name} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "150px", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>
                    🐕
                  </div>
                )}
                <div style={{ padding: "15px" }}>
                  <h4 style={{ margin: "0 0 5px 0", color: "#2f241d", fontSize: "18px" }}>{dog.name}</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#d97706", fontWeight: "bold" }}>{dog.breed}</p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ width: "100%", textAlign: "center", padding: "40px 0", color: "#6f5848" }}>
              Fetching pups... 🦴
            </div>
          )}
        </div>

        <button
          className="nav-register-btn"
          style={{
            width: "100%",
            fontSize: "18px",
            padding: "16px",
            background: "#d97706",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
          onClick={() => {
            close();
            navigate("/browse-dogs");
          }}
        >
          See All {category}
        </button>
      </div>
    </div>
  );
}

function AdoptionFormModal({ dog, close }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!dog) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="form-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>&times;</button>
        {!submitted ? (
          <>
            <h2 className="form-title">Adoption Application</h2>
            <p className="form-subtitle">Apply to adopt <strong>{dog.name}</strong>.</p>
            <form onSubmit={handleSubmit} className="form-stack">
              <input className="form-input" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <input className="form-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="form-input" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <textarea className="form-input" placeholder="About you" value={message} onChange={(e) => setMessage(e.target.value)} rows="4" required />
              <button type="submit" className="register-btn-top" style={{ width: "100%" }}>Submit Application</button>
            </form>
          </>
        ) : (
          <div className="success-box" style={{ textAlign: "center" }}>
            <h2>Application Submitted</h2>
            <p>We will contact you about <strong>{dog.name}</strong> soon.</p>
            <button className="register-btn-top" onClick={close}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DogModal({ dog, close, requireAuth }) {
  if (!dog) return null;

  return (
    <div className="modal-overlay" onClick={close}>
      <div
        className="modal-content"
        style={{ width: "900px", overflow: "hidden", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-x" onClick={close}>&times;</button>

        {dog.image ? (
          <img src={dog.image} alt={dog.name} style={{ width: "100%", height: "340px", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "340px", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px" }}>
            🐕
          </div>
        )}

        <div style={{ padding: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: "32px", color: "#2f241d", margin: "0 0 5px 0" }}>{dog.name}</h2>
              <p style={{ color: "#d97706", fontWeight: "bold", margin: 0, fontSize: "18px" }}>{dog.breed}</p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="nav-login-btn" onClick={requireAuth}>
                ❤️ Save
              </button>
              <button className="nav-register-btn" onClick={requireAuth}>
                Apply to Adopt
              </button>
            </div>
          </div>

          <p style={{ margin: "20px 0", lineHeight: "1.6", color: "#5f4a3c", fontSize: "16px" }}>
            {dog.description || `${dog.name} is a wonderful ${dog.breed} looking for a forever home. They are fully vetted, microchipped, and ready to meet their new family.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [modalMode, setModalMode] = useState(null);
  const [selectedDog, setSelectedDog] = useState(null);
  const [applicationDog, setApplicationDog] = useState(null);
  const [previewCategory, setPreviewCategory] = useState(null);
  const [dogs, setDogs] = useState([]);

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     sendMessage("request.dogs.list", { limit: 12 })
  //       .then((result) => {
  //         if (result && result.success && Array.isArray(result.dogs) && result.dogs.length > 0) {
  //           setDogs(result.dogs.map((dog) => ({
  //             ...dog,
  //             id: dog.dog_id,
  //             image: dog.photos ? dog.photos.split(",")[0].trim() : "",
  //             size: dog.size === "small" ? "Small"
  //                 : dog.size === "medium" ? "Medium"
  //                 : dog.size === "large" || dog.size === "extra_large" ? "Large"
  //                 : "Medium",
  //             ageGroup: Number(dog.age_years) <= 1 ? "Puppy" : "Adult",
  //           })));
  //         }
  //       })
  //       .catch(() => {});
  //   }, 5000);
  //
  //   return () => clearTimeout(timer);
  // }, []);

  const featuredDogs = useMemo(() => {
    return dogs.slice(0, 4);
  }, [dogs]);

  function requireAuth() {
    setSelectedDog(null);
    setModalMode("register");
  }

  return (
    <div className="landing-page" id="home">
      <nav className="top-nav">
        <button className="login-btn-top" onClick={() => setModalMode("login")}>
          Login
        </button>
        <button className="register-btn-top" onClick={() => setModalMode("register")}>
          Register
        </button>
      </nav>

      <header className="hero-banner">
        <h1>Find your New Best Friend</h1>
        <p>Browse dogs from our network of local shelters.</p>
      </header>

      <nav className="category-container">
        <div className="category-card" onClick={() => setPreviewCategory("Small Dogs")}>
          <div className="category-icon">🐕</div>
          <h3>Small Dogs</h3>
        </div>
        <div className="category-card" onClick={() => setPreviewCategory("Large Dogs")}>
          <div className="category-icon">🦮</div>
          <h3>Large Dogs</h3>
        </div>
        <div className="category-card" onClick={() => setPreviewCategory("Puppies")}>
          <div className="category-icon">🐾</div>
          <h3>Puppies</h3>
        </div>
        <div className="category-card" onClick={() => navigate("/shelters")}>
          <div className="category-icon">🏡</div>
          <h3>Shelters</h3>
        </div>
      </nav>

      <section className="available-dogs-section">
        <h2>Dogs Available for Adoption</h2>

        <div className="pet-grid">
          {featuredDogs.map((dog) => (
            <div
              key={dog.id}
              className="pet-card"
              onClick={() => setSelectedDog(dog)}
            >
              <div
                className="pet-card-heart"
                onClick={(e) => {
                  e.stopPropagation();
                  requireAuth();
                }}
              >
                ♡
              </div>
              {dog.image ? (
                <img src={dog.image} alt={dog.name} className="pet-card-img" />
              ) : (
                <div className="pet-card-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "64px" }}>
                  🐕
                </div>
              )}
              <h3 className="pet-card-name">{dog.name}</h3>
            </div>
          ))}

          <div className="see-more-card" onClick={() => navigate("/browse-dogs")}>
            <div className="see-more-icon">🐾</div>
            <h3>12+ more dogs</h3>
            <p>available on Canine Connections</p>
            <p style={{ marginTop: "15px", fontWeight: "bold" }}>MEET THEM</p>
          </div>
        </div>
      </section>

      {previewCategory && (
        <CategoryPreviewModal
          category={previewCategory}
          dogs={dogs}
          close={() => setPreviewCategory(null)}
          navigate={navigate}
        />
      )}

      {selectedDog && (
        <DogModal
          dog={selectedDog}
          close={() => setSelectedDog(null)}
          requireAuth={requireAuth}
        />
      )}

      {applicationDog && (
        <AdoptionFormModal
          dog={applicationDog}
          close={() => setApplicationDog(null)}
        />
      )}

      {modalMode && (
        <AuthModal
          mode={modalMode}
          close={() => setModalMode(null)}
          switchMode={setModalMode}
        />
      )}
    </div>
  );
}