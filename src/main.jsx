import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "./index.css"
import Login from "./pages/Login.jsx"
import Register from "./pages/Register.jsx"
import Landing from "./pages/Landing.jsx"
import RegisterSuccess from "./pages/RegisterSuccess.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/landing"
          element={
            <ProtectedRoute>
              <Landing />
            </ProtectedRoute>
          }
        />
        <Route path="/register-success" element={<RegisterSuccess />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
