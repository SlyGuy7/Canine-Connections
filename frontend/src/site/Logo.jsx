import React from "react"
import { Link } from "react-router-dom"
import { PawPrint } from "lucide-react"

export default function Logo() {
  return (
    <Link to="/landing" className="s-logo" aria-label="Canine Connections home">
      <span className="s-logo__mark"><PawPrint size={18} strokeWidth={2.5} /></span>
      Canine Connections
    </Link>
  )
}
