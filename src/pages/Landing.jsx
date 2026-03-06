import { Link, useNavigate } from "react-router-dom"

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div>
      <h1>Landing Page</h1>
      <p>Welcome. Choose an option.</p>
      <div>
        <Link to="/login">Login</Link>
      </div>
      <div>
        <Link to="/register">Register</Link>
      </div>
      <button
        onClick={() => {
          localStorage.removeItem("auth")
          navigate("/login")
        }}
      >
        Logout
      </button>
    </div>
  )
}