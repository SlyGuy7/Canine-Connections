import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  const isAuthenticated = !!localStorage.getItem("userId")
  if (!isAuthenticated) return <Navigate to="/landing" replace />
  return children
}
