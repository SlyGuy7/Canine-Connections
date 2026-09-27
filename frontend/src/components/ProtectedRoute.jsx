import { Navigate } from "react-router-dom"
import { hasUserSession } from "../services/auth"

// Shows logged-in pages only with an unexpired session token. The backend enforces the same
// rule on every request; this just avoids rendering pages that would fail to load.
export default function ProtectedRoute({ children }) {
  if (!hasUserSession()) return <Navigate to="/landing" replace />
  return children
}
