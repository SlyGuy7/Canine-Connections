import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  const isAuthenticated = true //!!localStorage.getItem("userId")
  if (!isAuthenticated) return <Navigate to="/" replace />
  return children
}
