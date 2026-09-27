// Route guard for all authenticated user pages (Dashboard, Journal, Applications, etc.).
// If the user is not logged in, they are redirected to the landing page.
import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  // A userId in localStorage means the user completed login. No userId means they must log in first.
  const isAuthenticated = !!localStorage.getItem("userId")
  if (!isAuthenticated) return <Navigate to="/landing" replace />
  // User is authenticated — render the requested page.
  return children
}
