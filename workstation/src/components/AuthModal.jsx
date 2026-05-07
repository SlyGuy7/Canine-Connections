// Modal that wraps the Login, Register, and ForgotPassword forms into a single overlay.
// The parent controls which form is active via the `mode` prop and `switchMode` callback.
import Login from "../pages/Login"
import Register from "../pages/Register"
import ForgotPassword from "../pages/ForgotPassword"

// Props:
//   mode       — "login" | "register" | "forgot-password" — which form to render
//   close      — called when the X button is clicked to dismiss the modal
//   switchMode — called with a new mode string when the user clicks a switch link
export default function AuthModal({ mode, close, switchMode }) {

// Returns the title and subtitle shown at the top of the modal based on the active mode.
const getHeaderContent = () => {
if (mode === "login") return { title: "Welcome Back", sub: "Log in to continue your adoption journey." }
if (mode === "register") return { title: "Join Canine Connections", sub: "Create an account to meet your future best friend." }
return { title: "Reset Password", sub: "Enter your email to receive instructions." }
}

const content = getHeaderContent()

return (
// Semi-transparent dark overlay that covers the full viewport behind the modal.
<div style={styles.overlay} className="auth-modal-overlay">
  {/* stopPropagation prevents a click inside the modal from bubbling up and closing it. */}
  <div style={styles.modal} className="auth-modal" onClick={(e) => e.stopPropagation()}>
    <button style={styles.close} onClick={close}>x</button>

    {/* Header section with paw icon, dynamic title, and subtitle */}
    <div style={styles.header}>
      <div style={styles.paw}>🐾</div>
      <h2 style={styles.title}>{content.title}</h2>
      <p style={styles.subtitle}>{content.sub}</p>
    </div>

    {/* Render the Login form with a link to switch to Register or Forgot Password */}
    {mode === "login" && (
      <>
        <Login switchToForgot={() => switchMode("forgot-password")} />
        <p style={styles.switchText}>
          Need an account?{" "}
          <button style={styles.switchBtn} onClick={() => switchMode("register")}>
            Register
          </button>
        </p>
      </>
    )}

    {/* Render the Register form with a link to switch back to Login */}
    {mode === "register" && (
      <>
        <Register />
        <p style={styles.switchText}>
          Already have an account?{" "}
          <button style={styles.switchBtn} onClick={() => switchMode("login")}>
            Login
          </button>
        </p>
      </>
    )}

    {/* Render the ForgotPassword form with a link to return to Login */}
    {mode === "forgot-password" && (
      <>
        <ForgotPassword />
        <p style={styles.switchText}>
          Remember your password?{" "}
          <button style={styles.switchBtn} onClick={() => switchMode("login")}>
            Back to Login
          </button>
        </p>
      </>
    )}
  </div>
</div>
)
}

const styles = {
overlay: {
position: "fixed",
inset: 0,
background: "rgba(43, 30, 22, 0.45)",
display: "flex",
justifyContent: "center",
alignItems: "center",
zIndex: 1000,
padding: "20px",
},
modal: {
width: "440px",
maxWidth: "100%",
maxHeight: "90vh",
overflowY: "auto",
background: "#fffaf5",
color: "#2f241d",
borderRadius: "22px",
padding: "30px 26px 24px",
position: "relative",
boxShadow: "0 24px 70px rgba(60, 35, 20, 0.25)",
border: "1px solid #f1dfcf",
},
close: {
position: "absolute",
top: "12px",
right: "14px",
border: "none",
background: "transparent",
fontSize: "28px",
lineHeight: 1,
color: "#7a5c47",
cursor: "pointer",
},
header: {
textAlign: "center",
marginBottom: "18px",
},
paw: {
fontSize: "32px",
marginBottom: "8px",
},
title: {
margin: "0 0 8px 0",
fontSize: "28px",
},
subtitle: {
margin: 0,
color: "#6f5848",
fontSize: "15px",
},
switchText: {
marginTop: "16px",
textAlign: "center",
color: "#6f5848",
},
switchBtn: {
border: "none",
background: "transparent",
color: "#d97706",
cursor: "pointer",
padding: 0,
fontWeight: "600",
},
}