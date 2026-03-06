import { Link } from "react-router-dom"

export default function RegisterSuccess() {
  return (
    <div>
      <h1>Thank you for registering!</h1>
      <Link to="/landing">Return Home</Link>
    </div>
  )
}