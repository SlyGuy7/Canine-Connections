import { useMemo, useState } from "react"
import AuthModal from "../components/AuthModal"
import Navbar from "../components/Navbar"

const featuredDogs = [
  {
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    age: "2 years old",
    ageGroup: "Young",
    sex: "Male",
    size: "Large",
    location: "Newark, NJ",
    description:
      "Buddy is a friendly and playful dog who loves people, long walks, and tennis balls.",
    image:
      "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 2,
    name: "Luna",
    breed: "Husky Mix",
    age: "1 year old",
    ageGroup: "Puppy",
    sex: "Female",
    size: "Medium",
    location: "Jersey City, NJ",
    description:
      "Luna is energetic, smart, and loves attention. She would thrive in an active home.",
    image:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 3,
    name: "Max",
    breed: "Labrador Mix",
    age: "3 years old",
    ageGroup: "Adult",
    sex: "Male",
    size: "Large",
    location: "Hoboken, NJ",
    description:
      "Max is calm, affectionate, and easygoing. He enjoys cuddles and quiet afternoons.",
    image:
      "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 4,
    name: "Daisy",
    breed: "Beagle Mix",
    age: "4 years old",
    ageGroup: "Adult",
    sex: "Female",
    size: "Small",
    location: "Edison, NJ",
    description:
      "Daisy is sweet, curious, and loves sniffing around outside. Great for a loving family.",
    image:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=900&q=80",
  },
]

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
    <div style={styles.modalOverlay}>
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
    <div style={styles.modalOverlay}>
      <div style={styles.dogModal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={close}>
          ×
        </button>

        <img src={dog.image} alt={dog.name} style={styles.modalImage} />

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
  const [modalMode, setModalMode] = useState(null)
  const [selectedDog, setSelectedDog] = useState(null)
  const [applicationDog, setApplicationDog] = useState(null)
  const [breedFilter, setBreedFilter] = useState("All")
  const [ageFilter, setAgeFilter] = useState("All")

  const breedOptions = ["All", ...new Set(featuredDogs.map((dog) => dog.breed))]
  const ageOptions = ["All", ...new Set(featuredDogs.map((dog) => dog.ageGroup))]

  const filteredDogs = useMemo(() => {
    return featuredDogs.filter((dog) => {
      const breedMatch = breedFilter === "All" || dog.breed === breedFilter
      const ageMatch = ageFilter === "All" || dog.ageGroup === ageFilter
      return breedMatch && ageMatch
    })
  }, [breedFilter, ageFilter])

  function openApplication(dog) {
    setSelectedDog(null)
    setApplicationDog(dog)
  }

  return (
    <div style={styles.page} id="home">
      <Navbar />

      <div style={styles.heroSection}>
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
          </div>
        </div>
      </div>

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

        <div style={styles.cardGrid}>
          {filteredDogs.map((dog) => (
            <div key={dog.id} style={styles.card}>
              <img src={dog.image} alt={dog.name} style={styles.cardImage} />

              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{dog.name}</h3>
                <p style={styles.cardText}>{dog.breed}</p>
                <p style={styles.cardText}>{dog.age}</p>

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
      </div>

      <div style={styles.infoSection} id="shelters">
        <h2 style={styles.infoTitle}>Partner Shelters</h2>
        <p style={styles.infoText}>
          Work with trusted shelters to find the right companion. Learn each
          dog’s story and adopt with confidence.
        </p>
      </div>

      <div style={styles.infoSection} id="contact">
        <h2 style={styles.infoTitle}>Contact Us</h2>
        <p style={styles.infoText}>
          Questions about adoption, fostering, or volunteering? Reach out and
          we will help you start your journey.
        </p>
      </div>

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
    backgroundImage:
      "linear-gradient(rgba(60,40,25,0.55), rgba(60,40,25,0.55)), url('https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1600&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },

  heroSection: {
    minHeight: "70vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "100px 20px 40px",
  },

  heroCard: {
    maxWidth: "760px",
    width: "100%",
    background: "rgba(255,250,245,0.92)",
    borderRadius: "28px",
    padding: "50px 36px",
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
    fontSize: "56px",
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

  dogSection: {
    padding: "40px 20px 60px",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  sectionTitle: {
    color: "#fffaf5",
    fontSize: "34px",
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

  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "22px",
  },

  card: {
    background: "rgba(255,250,245,0.95)",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
  },

  cardImage: {
    width: "100%",
    height: "230px",
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

  viewDogBtn: {
    marginTop: "12px",
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

  infoSection: {
    maxWidth: "1000px",
    margin: "0 auto 50px auto",
    background: "rgba(255,250,245,0.9)",
    borderRadius: "22px",
    padding: "30px",
  },

  infoTitle: {
    fontSize: "28px",
    textAlign: "center",
    color: "#2f241d",
  },

  infoText: {
    textAlign: "center",
    color: "#5f4a3c",
    fontSize: "17px",
    lineHeight: "1.6",
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