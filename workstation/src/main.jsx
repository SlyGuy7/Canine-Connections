import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "./index.css"
import Landing from "./pages/Landing.jsx"
import RegisterSuccess from "./pages/RegisterSuccess.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import MyDogs from "./pages/MyDogs.jsx"
import Messages from "./pages/Messages.jsx"
import Applications from "./pages/Applications.jsx"
import BrowseDogs from "./pages/BrowseDogs.jsx"
import DogProfile from "./pages/DogProfile.jsx"
import Settings from "./pages/Settings.jsx"
import Layout from "./components/Layout.jsx"
import { ToastProvider } from "./context/ToastContext"
import ApplicationForm from "./pages/ApplicationForm.jsx"
import Shelters from "./pages/Shelters.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
<React.StrictMode>
<ToastProvider>
<BrowserRouter>
<Routes>
<Route path="/" element={<Navigate to="/landing" replace />} />
<Route path="/landing" element={<Landing />} />
<Route path="/register-success" element={<RegisterSuccess />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-dogs"
        element={
          <ProtectedRoute>
            <Layout>
              <MyDogs />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Layout>
              <Messages />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <Layout>
              <Applications />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/apply"
        element={
          <ProtectedRoute>
            <Layout>
              <ApplicationForm />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dogs/:id"
        element={
          <Layout>
            <DogProfile />
          </Layout>
        }
      />

      <Route
        path="/browse-dogs"
        element={
          <Layout>
            <BrowseDogs />
          </Layout>
        }
      />

      <Route
        path="/shelters"
        element={
          <Layout>
            <Shelters />
          </Layout>
        }
      />

      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  </BrowserRouter>
</ToastProvider>
</React.StrictMode>
)