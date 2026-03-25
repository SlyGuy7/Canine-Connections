import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "./index.css"
import Landing from "./pages/Landing.jsx"
import RegisterSuccess from "./pages/RegisterSuccess.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import MyDogs from "./pages/MyDogs.jsx";
import Messages from "./pages/Messages.jsx";
import Applications from "./pages/Applications.jsx";
import BrowseDogs from "./pages/BrowseDogs.jsx";
import DogProfile from "./pages/DogProfile.jsx";

function Settings() {
  return <div style={{ padding: "30px" }}><h1>Settings</h1></div>
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/register-success" element={<RegisterSuccess />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dogs/:id"
          element={
            <ProtectedRoute>
              <DogProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-dogs"
          element={
            <ProtectedRoute>
              <MyDogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />

        <Route
          path="/applications"
          element={
            <ProtectedRoute>
              <Applications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/browse-dogs"
          element={
            <ProtectedRoute>
              <BrowseDogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)