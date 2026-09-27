// Email verification landing page — the user arrives here after clicking the link in their
// registration email. Reads the token from the URL query string and sends it to
// request.auth.verify. The status state drives which of three panels is shown:
// "verifying" (loading spinner), "success" (link to login), or "error" (expired/invalid token).
import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import { CircleCheck, CircleX, PawPrint } from "lucide-react"

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")
  // "verifying" → "success" | "error" after the backend responds; a link without a token fails immediately.
  const [status, setStatus] = useState(token ? "verifying" : "error")
  const [error, setError] = useState(token ? "" : "No verification token found in the link.")

  useEffect(() => {
    if (!token) return
    sendMessage("request.auth.verify", { token })
      .then(result => {
        if (result?.success) {
          setStatus("success")
        } else {
          setStatus("error")
          setError(result?.error || "Verification failed. The link may have expired.")
        }
      })
      .catch(() => {
        setStatus("error")
        setError("Could not connect. Please try again.")
      })
  }, [token])

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)", padding: "20px" }}>
      <div style={{ background: "var(--card-bg)", borderRadius: "24px", padding: "52px 40px", maxWidth: "460px", width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid var(--border)" }}>

        {status === "verifying" && (
          <>
            <div style={{ fontSize: "56px", marginBottom: "20px" }}><PawPrint size={45} strokeWidth={1.5} /></div>
            <h2 style={{ color: "var(--text-primary)", fontSize: "26px", fontWeight: "800", margin: "0 0 12px 0" }}>Verifying your email…</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "16px", margin: 0 }}>Just a moment while we activate your account.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: "56px", marginBottom: "20px" }}><CircleCheck size={45} strokeWidth={1.5} /></div>
            <h2 style={{ color: "var(--text-primary)", fontSize: "26px", fontWeight: "800", margin: "0 0 12px 0" }}>Email Verified!</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "16px", margin: "0 0 32px 0" }}>
              Your account is now active. You can log in and start your adoption journey.
            </p>
            <button
              onClick={() => navigate("/")}
              style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "17px", cursor: "pointer" }}
            >
              Go to Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: "56px", marginBottom: "20px" }}><CircleX size={45} strokeWidth={1.5} /></div>
            <h2 style={{ color: "var(--text-primary)", fontSize: "26px", fontWeight: "800", margin: "0 0 12px 0" }}>Verification Failed</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "16px", margin: "0 0 32px 0" }}>{error}</p>
            <button
              onClick={() => navigate("/")}
              style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "17px", cursor: "pointer" }}
            >
              Back to Home
            </button>
          </>
        )}

      </div>
    </div>
  )
}
