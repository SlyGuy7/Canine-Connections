// Route guard for all /admin/* pages.
// Checks localStorage for a valid admin session set by AdminLogin on successful login.
import { Navigate } from "react-router-dom"

export default function AdminGuard({ children }) {
  // Read the three session keys stored by AdminLogin.jsx after a successful admin login.
  const isAdmin = localStorage.getItem("adminToken") === "true"
  const role    = localStorage.getItem("adminRole")
  const adminId = localStorage.getItem("adminUserId")

  // Only super_admin and shelter_admin roles are permitted; anything else redirects to the login page.
  const allowed = isAdmin && adminId && (role === "super_admin" || role === "shelter_admin")
  if (!allowed) return <Navigate to="/admin" replace />

  // Session is valid — render the protected admin page.
  return children
}
