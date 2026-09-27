// Shell for the public website: header, footer and the login / sign-up dialog.
// Used for the landing and info pages, and for browse/shelters/resources when logged out.
import React, { useMemo, useState } from "react"
import SiteHeader from "./SiteHeader"
import SiteFooter from "./SiteFooter"
import AuthModal from "../components/AuthModal"
import { AuthModalContext } from "./authModal"
import "./site.css"

export default function PublicLayout({ children, contained = false }) {
  const [authMode, setAuthMode] = useState(null)
  const value = useMemo(() => ({ openAuth: setAuthMode }), [])

  return (
    <AuthModalContext.Provider value={value}>
      <div className="s-page">
        <SiteHeader />
        <main className="s-main">
          {contained ? <div className="s-container s-app-content">{children}</div> : children}
        </main>
        <SiteFooter />
      </div>
      {authMode && <AuthModal mode={authMode} close={() => setAuthMode(null)} switchMode={setAuthMode} />}
    </AuthModalContext.Provider>
  )
}
