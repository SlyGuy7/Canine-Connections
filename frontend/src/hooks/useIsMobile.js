// Custom hook that returns true when the viewport width is below the given breakpoint (default 768px).
// Used by Layout.jsx and other components to switch between mobile and desktop rendering modes.
import { useState, useEffect } from "react"

export function useIsMobile(breakpoint = 768) {
  // Initialise from the current window width so the first render is already correct.
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    // Update the state reactively whenever the window is resized.
    window.addEventListener("resize", handler)
    // Clean up the listener when the component unmounts to prevent memory leaks.
    return () => window.removeEventListener("resize", handler)
  }, [breakpoint])

  return isMobile
}
