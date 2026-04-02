import React from "react"
import Sidebar from "./Sidebar"

export default function Layout({ children }) {
  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#fffaf5"
  },
  mainContent: {
    flex: 1,
    height: "100vh",
    overflowY: "auto"
  }
}