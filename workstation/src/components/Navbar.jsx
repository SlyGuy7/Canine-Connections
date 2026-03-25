export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>🐾 Canine Connections</div>

      <div style={styles.links}>
        <a href="#home" style={styles.link}>Home</a>
        <a href="#dogs" style={styles.link}>Dogs</a>
        <a href="#shelters" style={styles.link}>Shelters</a>
        <a href="#contact" style={styles.link}>Contact</a>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 30px",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
    boxSizing: "border-box",
  },
  logo: {
    color: "#fffaf5",
    fontSize: "22px",
    fontWeight: "700",
  },
  links: {
    display: "flex",
    gap: "22px",
  },
  link: {
    color: "#fffaf5",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "15px",
  },
}
