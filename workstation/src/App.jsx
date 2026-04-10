import React from "react"
import { Routes, Route } from "react-router-dom"

import Landing from "./pages/Landing"
import Dashboard from "./pages/Dashboard"
import BrowseDogs from "./pages/BrowseDogs"
import DogProfile from "./pages/DogProfile"
import Shelters from "./pages/Shelters"
import ShelterDetails from "./pages/ShelterDetails"
import SavedDogs from "./pages/SavedDogs"
import Settings from "./pages/Settings"
import ForgotPassword from "./pages/ForgotPassword"
import Quiz from "./pages/Quiz"
import QuizResults from "./pages/QuizResults"
import ApplicationForm from "./pages/ApplicationForm"
import Applications from "./pages/Applications"
import Register from "./pages/Register"
import Journal from "./pages/Journal"
import NotFound from "./pages/NotFound"

import AdminLogin from "./pages/AdminLogin"
import AdminDashboard from "./pages/AdminDashboard"
import AdminDogs from "./pages/AdminDogs"
import AdminApplications from "./pages/AdminApplications"
import AdminStories from "./pages/AdminStories"
import AdminUsers from "./pages/AdminUsers"
import AdminGuard from "./components/AdminGuard"

export default function App() {
  return (
    <Routes>
      <Route path="/"                element={<Landing />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/dashboard"       element={<Dashboard />} />
      <Route path="/browse-dogs"     element={<BrowseDogs />} />
      <Route path="/dogs/:id"        element={<DogProfile />} />
      <Route path="/shelters"        element={<Shelters />} />
      <Route path="/shelter-details" element={<ShelterDetails />} />
      <Route path="/my-dogs"         element={<SavedDogs />} />
      <Route path="/settings"        element={<Settings />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      <Route path="/apply"           element={<ApplicationForm />} />
      <Route path="/applications"    element={<Applications />} />
      <Route path="/quiz"            element={<Quiz />} />
      <Route path="/quiz-results"    element={<QuizResults />} />
      <Route path="/journal" element={<div style={{padding: '100px', fontSize: '50px'}}>JOURNAL TEST IS WORKING</div>} />

      <Route path="/admin"           element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="/admin/dogs"      element={<AdminGuard><AdminDogs /></AdminGuard>} />
      <Route path="/admin/applications" element={<AdminGuard><AdminApplications /></AdminGuard>} />
      <Route path="/admin/stories"   element={<AdminGuard><AdminStories /></AdminGuard>} />
      <Route path="/admin/users"     element={<AdminGuard><AdminUsers /></AdminGuard>} />

      <Route path="*"                element={<NotFound />} />
    </Routes>
  )
}