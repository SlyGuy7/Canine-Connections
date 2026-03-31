import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import AuthModal from "../components/AuthModal"
import Navbar from "../components/Navbar"

function AdoptionFormModal({ dog, close }) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)

  if (!dog) return null

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div style={styles.modalOverlay} onClick={close}>
      <div style={styles.formModal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={close}>
          ×
        </button>

        {!submitted ? (
          <>
            <h2 style={styles.formTitle}>Adoption Application</h2>
            <p style={styles.formSubtitle}>
              Apply to adopt <strong>{dog.name}</strong>.
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div>
                <label style={styles.formLabel}>Full Name</label>
                <input
                  style={styles.formInput}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label style={styles.formLabel}>Email</label>
                <input
                  style={styles.formInput}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label style={styles.formLabel}>Phone</label>
                <input
                  style={styles.formInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div>
                <label style={styles.formLabel}>Why would you be a good match?</label>
                <textarea
                  style={styles.formTextarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us a little about yourself"
                  rows="4"
                  required
                />
              </div>

              <button type="submit" style={styles.submitApplicationBtn}>
                Submit Application
              </button>
            </form>
          </>
        ) : (
          <div style={styles.successBox}>
            <h2 style={styles.formTitle}>Application Submitted</h2>
            <p style={styles.formSubtitle}>
              Your application for <strong>{dog.name}</strong> has been sent.
            </p>
            <button style={styles.submitApplicationBtn} onClick={close}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DogModal({ dog, close, openApplication }) {
  if (!dog) return null

  return (
    <div style={styles.modalOverlay} onClick={close}>
      <div style={styles.dogModal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={close}>
          ×
        </button>

        <img
          src={dog.image || "https://via.placeholder.com/900x500?text=Dog"}
          alt={dog.name}
          style={styles.modalImage}
        />

        <div style={styles.modalBody}>
          <h2 style={styles.modalTitle}>{dog.name}</h2>
          <p style={styles.modalBreed}>{dog.breed}</p>

          <div style={styles.modalMetaGrid}>
            <div style={styles.metaBox}>
              <span style={styles.metaLabel}>Age</span>
              <span style={styles.metaValue}>{dog.age}</span>
            </div>

            <div style={styles.metaBox}>
              <span style={styles.metaLabel}>Sex</span>
              <span style={styles.metaValue}>{dog.sex}</span>
            </div>

            <div style={styles.metaBox}>
              <span style={styles.metaLabel}>Size</span>
              <span style={styles.metaValue}>{dog.size}</span>
            </div>

            <div style={styles.metaBox}>
              <span style={styles.metaLabel}>Location</span>
              <span style={styles.metaValue}>{dog.location}</span>
            </div>
          </div>

          <p style={styles.modalDescription}>{dog.description}</p>

          <button style={styles.adoptBtn} onClick={() => openApplication(dog)}>
            Apply to Adopt
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  const [modalMode, setModalMode] = useState(null)
  const [selectedDog, setSelectedDog] = useState(null)
  const [applicationDog, setApplicationDog] = useState(null)

  const [dogs, setDogs] = useState([])
  const [loadingDogs, setLoadingDogs] = useState(true)
  const [dogsError, setDogsError] = useState("")

  const [breedFilter, setBreedFilter] = useState("All")
  const [ageFilter, setAgeFilter] = useState("All")

  useEffect(() => {
    loadDogs()
  }, [])

  async function loadDogs() {
    setLoadingDogs(true)
    setDogsError("")

    try {
      const result = await sendMessage("request.dogs.get", {})

      const rawDogs = Array.isArray(result?.dogs) ? result.dogs : []

      const normalizedDogs = rawDogs.map((dog, index) => ({
        id: dog.id || index + 1,
        name: dog.name || "Unknown Dog",
        breed: dog.breed || "Unknown Breed",
        age: dog.age || "Age not listed",
        ageGroup: dog.ageGroup || inferAgeGroup(dog.age),
        sex: dog.sex || "Unknown",
        size: dog.size || "Unknown",
        location: dog.location || "Location not listed",
        description:
          dog.description ||
          "This dog is looking for a loving home.",
        image: dog.image || dog.photo || dog.image_url || "",
      }))

      setDogs(normalizedDogs)
    } catch (error) {
      console.log("Failed to load dogs:", error)
      setDogsError("Could not load dogs right now.")
      setDogs([])
    } finally {
      setLoadingDogs(false)
    }
  }

  function inferAgeGroup(age) {
    if (!age) return "Unknown"

    const lowerAge = String(age).toLowerCase()

    if (lowerAge.includes("month") || lowerAge.includes("puppy")) {
      return "Puppy"
    }

    const firstNumber = parseInt(lowerAge)

    if (!isNaN(firstNumber)) {
      if (firstNumber <= 1) return "Puppy"
      if (firstNumber <= 3) return "Young"
      return "Adult"
    }

    return "Unknown"
  }

  const breedOptions = useMemo(() => {
    return ["All", ...new Set(dogs.map((dog) => dog.breed).filter(Boolean))]
  }, [dogs])

  const ageOptions = useMemo(() => {
    return ["All", ...new Set(dogs.map((dog) => dog.ageGroup).filter(Boolean))]
  }, [dogs])

  const filteredDogs = useMemo(() => {
    return dogs.filter((dog) => {
      const breedMatch = breedFilter === "All" || dog.breed === breedFilter
      const ageMatch = ageFilter === "All" || dog.ageGroup === ageFilter
      return breedMatch && ageMatch
    })
  }, [dogs, breedFilter, ageFilter])

  function openApplication(dog) {
    setSelectedDog(null)
    setApplicationDog(dog)
  }

  return (
    <div style={styles.page} id="home">
      <Navbar />

      <section style={styles.heroSection}>
        <div style={styles.heroOverlay}>
          <div style={styles.heroCard}>
            <div style={styles.badge}>🐶 Dog Adoption Made Simple</div>

            <h1 style={styles.title}>Canine Connections</h1>

            <p style={styles.subtitle}>
              Browse lovable dogs, connect with shelters, and take the first step
              toward bringing home your new best friend.
            </p>

            <div style={styles.buttonRow}>
              <button style={styles.loginBtn} onClick={() => setModalMode("login")}>
                Login
              </button>

              <button
                style={styles.registerBtn}
                onClick={() => setModalMode("register")}
              >
                Register
              </button>

              <button
                style={styles.browseBtn}
                onClick={() => navigate("/browse-dogs")}
              >
                Browse Dogs
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.statsStrip}>
        <div style={styles.statPill}>
          <span style={styles.statNumber}>{dogs.length}</span>
          <span style={styles.statText}>Dogs Available</span>
        </div>

        <div style={styles.statPill}>
          <span style={styles.statNumber}>{breedOptions.length - 1}</span>
          <span style={styles.statText}>Breeds Available</span>
        </div>

        <div style={styles.statPill}>
          <span style={styles.statNumber}>Fast</span>
          <span style={styles.statText}>Simple Application Process</span>
        </div>
      </section>

      <section style={styles.contentSection}>
        <div style={styles.dogSection} id="dogs">
          <h2 style={styles.sectionTitle}>Featured Dogs</h2>

          <div style={styles.filterBar}>
            <select
              style={styles.select}
              value={breedFilter}
              onChange={(e) => setBreedFilter(e.target.value)}
            >
              {breedOptions.map((breed) => (
                <option key={breed} value={breed}>
                  {breed === "All" ? "All Breeds" : breed}
                </option>
              ))}
            </select>

            <select
              style={styles.select}
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
            >
              {ageOptions.map((age) => (
                <option key={age} value={age}>
                  {age === "All" ? "All Ages" : age}
                </option>
              ))}
            </select>
          </div>

          {loadingDogs && (
            <div style={styles.messageBox}>Loading dogs...</div>
          )}

          {!loadingDogs && dogsError && (
            <div style={styles.errorBox}>{dogsError}</div>
          )}

          {!loadingDogs && !dogsError && filteredDogs.length === 0 && (
            <div style={styles.messageBox}>No dogs matched your filters.</div>
          )}

          {!loadingDogs && !dogsError && filteredDogs.length > 0 && (
            <div style={styles.cardGrid}>
              {filteredDogs.map((dog) => (
                <div
                  key={dog.id}
                  style={styles.card}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)"
                    e.currentTarget.style.boxShadow = "0 18px 38px rgba(0,0,0,0.12)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 14px 32px rgba(0,0,0,0.08)"
                  }}
                >
                  <img
                    src={dog.image || "https://via.placeholder.com/600x500?text=Dog"}
                    alt={dog.name}
                    style={styles.cardImage}
                  />

                  <div style={styles.cardBody}>
                    <h3 style={styles.cardTitle}>{dog.name}</h3>
                    <p style={styles.cardText}>{dog.breed}</p>

                    <div style={styles.cardTags}>
                      <span style={styles.cardTag}>{dog.ageGroup}</span>
                      <span style={styles.cardTag}>{dog.sex}</span>
                      <span style={styles.cardTag}>{dog.size}</span>
                    </div>

                    <p style={styles.cardText}>{dog.location}</p>

                    <button
                      style={styles.viewDogBtn}
                      onClick={() => setSelectedDog(dog)}
                    >
                      View Dog
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <section style={styles.featureSection}>
          <h2 style={styles.sectionTitle}>Why Adopt With Us</h2>

          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🐾</div>
              <h3 style={styles.featureTitle}>Verified Dogs</h3>
              <p style={styles.featureText}>
                Every profile is tied to a trusted shelter or rescue partner.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>💛</div>
              <h3 style={styles.featureTitle}>Simple Process</h3>
              <p style={styles.featureText}>
                Browse, learn, and apply without getting lost in complicated
                steps.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🏡</div>
              <h3 style={styles.featureTitle}>Better Matches</h3>
              <p style={styles.featureText}>
                Learn each dog’s age, size, personality, and needs before you
                apply.
              </p>
            </div>
          </div>
        </section>

        <div style={styles.infoGrid}>
          <div style={styles.infoSection} id="shelters">
            <h2 style={styles.infoTitle}>🏠 Partner Shelters</h2>
            <p style={styles.infoText}>
              Work with trusted shelters to find the right companion. Learn each
              dog’s story and adopt with confidence.
            </p>
          </div>

          <div style={styles.infoSection} id="contact">
            <h2 style={styles.infoTitle}>📞 Contact Us</h2>
            <p style={styles.infoText}>
              Questions about adoption, fostering, or volunteering? Reach out and
              we will help you start your journey.
            </p>
          </div>
        </div>
      </section>

      {modalMode && (
        <AuthModal
          mode={modalMode}
          close={() => setModalMode(null)}
          switchMode={setModalMode}
        />
      )}

      {selectedDog && (
        <DogModal
          dog={selectedDog}
          close={() => setSelectedDog(null)}
          openApplication={openApplication}
        />
      )}

      {applicationDog && (
        <AdoptionFormModal
          dog={applicationDog}
          close={() => setApplicationDog(null)}
        />
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f7efe7",
  },

  heroSection: {
    minHeight: "78vh",
    backgroundImage:
      "linear-gradient(rgba(60,40,25,0.58), rgba(60,40,25,0.58)), url('https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1600&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "90px 20px 70px",
  },

  heroOverlay: {
    width: "100%",
    maxWidth: "1200px",
    display: "flex",
    justifyContent: "center",
  },

  heroCard: {
    maxWidth: "780px",
    width: "100%",
    background: "rgba(255,250,245,0.94)",
    borderRadius: "30px",
    padding: "54px 38px",
    textAlign: "center",
    boxShadow: "0 30px 80px rgba(0,0,0,0.2)",
  },

  badge: {
    display: "inline-block",
    background: "#fde6cf",
    color: "#8a541b",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "18px",
  },

  title: {
    fontSize: "58px",
    margin: "0 0 14px 0",
    color: "#2f241d",
  },

  subtitle: {
    fontSize: "20px",
    lineHeight: "1.6",
    marginBottom: "30px",
    color: "#5f4a3c",
  },

  buttonRow: {
    display: "flex",
    gap: "14px",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  loginBtn: {
    padding: "14px 24px",
    borderRadius: "12px",
    border: "1px solid #d8c1af",
    background: "#fff",
    color: "#3a2d25",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "16px",
  },

  registerBtn: {
    padding: "14px 24px",
    borderRadius: "12px",
    border: "none",
    background: "#d97706",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "16px",
  },

  browseBtn: {
    padding: "14px 24px",
    borderRadius: "12px",
    border: "none",
    background: "#2f241d",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "16px",
  },

  statsStrip: {
    maxWidth: "1100px",
    margin: "-34px auto 40px auto",
    padding: "0 20px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    position: "relative",
    zIndex: 5,
  },

  statPill: {
    background: "#fffaf5",
    border: "1px solid #efdfd1",
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },

  statNumber: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#d97706",
    marginBottom: "4px",
  },

  statText: {
    fontSize: "15px",
    color: "#6a5344",
  },

  contentSection: {
    padding: "10px 20px 70px",
  },

  dogSection: {
    maxWidth: "1200px",
    margin: "0 auto 54px auto",
  },

  sectionTitle: {
    color: "#2f241d",
    fontSize: "36px",
    textAlign: "center",
    marginBottom: "24px",
  },

  filterBar: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: "26px",
  },

  select: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d8c1af",
    background: "#fffaf5",
    color: "#2f241d",
    fontSize: "15px",
    minWidth: "180px",
  },

  messageBox: {
    maxWidth: "700px",
    margin: "0 auto",
    textAlign: "center",
    background: "#fffaf5",
    border: "1px solid #efdfd1",
    borderRadius: "18px",
    padding: "18px",
    color: "#5f4a3c",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  },

  errorBox: {
    maxWidth: "700px",
    margin: "0 auto",
    textAlign: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: "18px",
    padding: "18px",
    color: "#9f1239",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "22px",
  },

  card: {
    background: "#fffaf5",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 14px 32px rgba(0,0,0,0.08)",
    border: "1px solid #efdfd1",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },

  cardImage: {
    width: "100%",
    height: "250px",
    objectFit: "cover",
  },

  cardBody: {
    padding: "18px",
  },

  cardTitle: {
    margin: "0 0 6px 0",
    fontSize: "24px",
    color: "#2f241d",
  },

  cardText: {
    margin: "4px 0",
    color: "#6a5344",
  },

  cardTags: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "10px",
    marginBottom: "14px",
  },

  cardTag: {
    background: "#fde6cf",
    color: "#8a541b",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
  },

  viewDogBtn: {
    marginTop: "14px",
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#d97706",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
  },

  featureSection: {
    maxWidth: "1200px",
    margin: "0 auto 50px auto",
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "22px",
  },

  featureCard: {
    background: "linear-gradient(180deg, #fffaf5 0%, #fff3e8 100%)",
    border: "1px solid #efdfd1",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
    textAlign: "center",
  },

  featureIcon: {
    fontSize: "36px",
    marginBottom: "12px",
  },

  featureTitle: {
    margin: "0 0 10px 0",
    fontSize: "22px",
    color: "#2f241d",
  },

  featureText: {
    margin: 0,
    color: "#5f4a3c",
    lineHeight: "1.6",
    fontSize: "16px",
  },

  infoGrid: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "22px",
  },

  infoSection: {
    background: "#fffaf5",
    borderRadius: "22px",
    padding: "30px",
    border: "1px solid #efdfd1",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  },

  infoTitle: {
    fontSize: "28px",
    textAlign: "center",
    color: "#2f241d",
    marginTop: 0,
  },

  infoText: {
    textAlign: "center",
    color: "#5f4a3c",
    fontSize: "17px",
    lineHeight: "1.6",
    marginBottom: 0,
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    zIndex: 1100,
  },

  dogModal: {
    width: "900px",
    maxWidth: "100%",
    background: "#fffaf5",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
    position: "relative",
  },

  formModal: {
    width: "560px",
    maxWidth: "100%",
    background: "#fffaf5",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
    position: "relative",
  },

  modalClose: {
    position: "absolute",
    top: "14px",
    right: "16px",
    border: "none",
    background: "rgba(255,255,255,0.9)",
    color: "#2f241d",
    fontSize: "26px",
    lineHeight: 1,
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    cursor: "pointer",
  },

  modalImage: {
    width: "100%",
    height: "340px",
    objectFit: "cover",
    display: "block",
  },

  modalBody: {
    padding: "26px",
  },

  modalTitle: {
    margin: "0 0 6px 0",
    fontSize: "34px",
    color: "#2f241d",
  },

  modalBreed: {
    margin: "0 0 18px 0",
    color: "#8a541b",
    fontSize: "18px",
    fontWeight: "600",
  },

  modalMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
  },

  metaBox: {
    background: "#fde6cf",
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  metaLabel: {
    fontSize: "13px",
    color: "#8a541b",
    fontWeight: "700",
  },

  metaValue: {
    fontSize: "15px",
    color: "#2f241d",
  },

  modalDescription: {
    color: "#5f4a3c",
    fontSize: "17px",
    lineHeight: "1.7",
    marginBottom: "18px",
  },

  adoptBtn: {
    padding: "14px 20px",
    borderRadius: "12px",
    border: "none",
    background: "#d97706",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "16px",
  },

  formTitle: {
    margin: "0 0 8px 0",
    fontSize: "30px",
    color: "#2f241d",
    textAlign: "center",
  },

  formSubtitle: {
    margin: "0 0 22px 0",
    color: "#6a5344",
    textAlign: "center",
    fontSize: "16px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  formLabel: {
    display: "block",
    marginBottom: "6px",
    color: "#4a382d",
    fontWeight: "600",
  },

  formInput: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #dcc8b7",
    background: "#fff",
    color: "#2f241d",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  formTextarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #dcc8b7",
    background: "#fff",
    color: "#2f241d",
    fontSize: "15px",
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
  },

  submitApplicationBtn: {
    marginTop: "6px",
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#d97706",
    color: "#fff",
    fontWeight: "700",
    fontSize: "16px",
    cursor: "pointer",
  },

  successBox: {
    textAlign: "center",
    paddingTop: "10px",
  },
}
