import Login from "../pages/Login"
import Register from "../pages/Register"

export default function AuthModal({ mode, close, switchMode }) {
  return (
    <div style={styles.overlay} onClick={close}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.close} onClick={close}>×</button>

        <div style={styles.header}>
          <div style={styles.paw}>🐾</div>
          <h2 style={styles.title}>
            {mode === "login" ? "Welcome Back" : "Join Canine Connections"}
          </h2>
          <p style={styles.subtitle}>
            {mode === "login"
              ? "Log in to continue your adoption journey."
              : "Create an account to meet your future best friend."}
          </p>
        </div>

        {mode === "login" ? (
          <>
            <Login />
            <p style={styles.switchText}>
              Need an account?{" "}
              <button style={styles.switchBtn} onClick={() => switchMode("register")}>
                Register
              </button>
            </p>
          </>
        ) : (
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