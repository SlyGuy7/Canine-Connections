import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    console.log("Register submit fired")
    e.preventDefault()
    setError("")

    if (!email || !password || !confirm) {
      setError("Please fill in all fields")
      return
    }

    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const result = await sendMessage("request.auth.register", {
        email,
        password,
        confirm,
      })

      if (result.success) {
        setLoading(false)
        navigate("/register-success")
        return
      }

      setLoading(false)
      setError(result.error || "Registration failed. Backend or database may be offline.")
      console.log("Register failed", result)
    } catch (err) {
      setLoading(false)
      setError("Registration failed. Backend or database may be offline.")
      console.log("Register error", err)
    }
  }

  return (
    <form onSubmit={onSubmit} style={styles.form}>
      {error && <p style={styles.error}>{error}</p>}

      <div>
        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Create a password"
        />
      </div>

      <div>
        <label style={styles.label}>Confirm Password</label>
        <input
          style={styles.input}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="Confirm your password"
        />
      </div>

      <button style={styles.button} type="submit" disabled={loading}>
        {loading ? "Creating Account..." : "Create Account"}
      </button>
    </form>
  )
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "600",
    color: "#4a382d",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #dcc8b7",
    background: "#fff",
    color: "#2f241d",
    fontSize: "15px",
    boxSizing: "border-box",
    marginBottom: "12px",
  },
  button: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#d97706",
    color: "#fff",
    fontWeight: "700",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "6px",
    boxShadow: "0 10px 24px rgba(217, 119, 6, 0.22)",
  },
  error: {
    background: "#fff1f2",
    color: "#b42318",
    border: "1px solid #fecdd3",
    borderRadius: "10px",
    padding: "10px 12px",
    margin: "0 0 10px 0",
    fontSize: "14px",
  },
}