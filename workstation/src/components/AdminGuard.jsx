import { Navigate } from "react-router-dom"

export default function AdminGuard({ children }) {
  const isAdmin = localStorage.getItem("adminToken") === "true"
  const role    = localStorage.getItem("adminRole")
  const adminId = localStorage.getItem("adminUserId")
  const allowed = isAdmin && adminId && (role === "super_admin" || role === "shelter_admin")
  if (!allowed) return <Navigate to="/admin" replace />
  return children
}
