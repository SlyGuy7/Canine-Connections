import React from "react"
import { Routes, Route, Outlet, Navigate } from "react-router-dom"

// Navigation
import Sidebar from "./components/Sidebar" // Ensure this path matches your folder structure

// Pages
import Landing from "./pages/Landing"
import Dashboard from "./pages/Dashboard"
import BrowseDogs from "./pages/BrowseDogs"
import DogProfile from "./pages/DogProfile"
import Shelters from "./pages/Shelters"
import ShelterDetails from "./pages/ShelterDetails"
import SavedDogs from "./pages/MyDogs"
import Settings from "./pages/Settings"
import ForgotPassword from "./pages/ForgotPassword"
import Quiz from "./pages/Quiz"
import QuizResults from "./pages/Quizresults"
import ApplicationForm from "./pages/ApplicationForm"
import Applications from "./pages/Applications"
import Register from "./pages/Register"
import Journal from "./pages/Journal"
import Profile from "./pages/Profile"
import NotFound from "./pages/NotFound"

// Admin
import AdminLogin from "./pages/AdminLogin"
import AdminDashboard from "./pages/AdminDashboard"
import AdminDogs from "./pages/AdminDogs"
import AdminApplications from "./pages/AdminApplications"
import AdminStories from "./pages/AdminStories"
import AdminUsers from "./pages/AdminUsers"
import AdminGuard from "./components/AdminGuard"
import ProtectedRoute from "./components/ProtectedRoute"

// Layout component to fix sidebar overlap
const AppLayout = () => {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', width: '100%', minHeight: '100vh', backgroundColor: '#f9fafb', padding: '40px' }}>
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public Pages (No Sidebar) */}
      <Route path="/"                element={<Landing />} />
      <Route path="/login"           element={<Navigate to="/" replace />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Admin Pages (No User Sidebar) */}
      <Route path="/admin"              element={<AdminLogin />} />
      <Route path="/admin/dashboard"    element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="/admin/dogs"         element={<AdminGuard><AdminDogs /></AdminGuard>} />
      <Route path="/admin/applications" element={<AdminGuard><AdminApplications /></AdminGuard>} />
      <Route path="/admin/stories"      element={<AdminGuard><AdminStories /></AdminGuard>} />
      <Route path="/admin/users"        element={<AdminGuard><AdminUsers /></AdminGuard>} />

      {/* User Pages (With Sidebar and Margin Fix) */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard"       element={<Dashboard />} />
        <Route path="/browse-dogs"     element={<BrowseDogs />} />
        <Route path="/dogs/:id"        element={<DogProfile />} />
        <Route path="/shelters"        element={<Shelters />} />
        <Route path="/shelter-details" element={<ShelterDetails />} />
        <Route path="/my-dogs"         element={<SavedDogs />} />
        <Route path="/profile"         element={<Profile />} />
        <Route path="/settings"        element={<Settings />} />
        <Route path="/apply"           element={<ApplicationForm />} />
        <Route path="/applications"    element={<Applications />} />
        <Route path="/quiz"            element={<Quiz />} />
        <Route path="/quiz-results"    element={<QuizResults />} />
        <Route path="/journal"         element={<Journal />} />
      </Route>

      {/* 404 Catch All */}
      <Route path="*"                element={<NotFound />} />
    </Routes>
  )
}