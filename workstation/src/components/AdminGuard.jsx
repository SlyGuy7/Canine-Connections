import React from "react"
import { Navigate } from "react-router-dom"

export default function AdminGuard({ children }) {
  const isAdmin = localStorage.getItem("adminToken") === "true"
  const role = localStorage.getItem("adminRole")
  const allowed = isAdmin && (role === "admin" || role === "shelter_staff")
  if (!allowed) return <Navigate to="/admin" replace />
  return children
}
