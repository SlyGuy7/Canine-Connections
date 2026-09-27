import { Navigate } from "react-router-dom"
import { hasAdminSession } from "../services/auth"

// Shows admin pages only with an unexpired admin session token. This is a UI convenience:
// the backend independently rejects admin requests that don't carry a valid admin token.
export default function AdminGuard({ children }) {
  if (!hasAdminSession()) return <Navigate to="/admin" replace />
  return children
}
