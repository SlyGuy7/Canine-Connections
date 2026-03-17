// import { Navigate } from "react-router-dom"

// export default function ProtectedRoute({ children }) {
//   const isLoggedIn = localStorage.getItem("auth") === "true"

//   if (!isLoggedIn) {
//     return <Navigate to="/login" replace />
//   }

//   return children
// }
import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  // const isAuthenticated = !!localStorage.getItem("token") 
  
  // TEMPORARY BYPASS: Always true so you can see your pages
  const isAuthenticated = true 

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />
  }

  return children
}