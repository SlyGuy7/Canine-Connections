import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { apiPost } from "../services/api"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const navigate = useNavigate()

  const onSubmit = async (e) => {
  e.preventDefault()

  const result = await apiPost("/auth/register", { email, password, confirm })

  if (result.success) {
    navigate("/register-success")
    return
  }

  console.log("Register failed", result)
}

  return (
    <div>
      <h1>Register Page</h1>

      <form onSubmit={onSubmit}>
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div>
          <label>Confirm</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>

        <button type="submit">Create Account</button>
      </form>

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}