import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { apiPost } from "../services/api"

export default function Login() {

  const emailState = useState("")
  const passwordState = useState("")
  const errorState = useState("")

  const email = emailState[0]
  const setEmail = emailState[1]

  const password = passwordState[0]
  const setPassword = passwordState[1]

  const error = errorState[0]
  const setError = errorState[1]

  const navigate = useNavigate()

  async function onSubmit(e) {

    e.preventDefault()

    const result = await apiPost("/auth/login", {
      email: email,
      password: password
    })

    if (result.success) {
      localStorage.setItem("auth", "true")
      navigate("/landing")
      return
    }

    console.log("Login failed", result)
  }

  return (
    <div>
      <h1>Login Page</h1>

      <form onSubmit={onSubmit}>
        <div>
          <label>Email</label>
          <input
            value={email}
            onChange={function(e) {
              setEmail(e.target.value)
            }}
          />
        </div>

        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={function(e) {
              setPassword(e.target.value)
            }}
          />
        </div>

        <button type="submit">Login</button>
      </form>

      <p>
        No Login? <Link to="/register">Register</Link>
      </p>
    </div>
  )
}