import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "./index.css"
import Landing from "./pages/Landing.jsx"
import RegisterSuccess from "./pages/RegisterSuccess.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import AdminGuard from "./components/AdminGuard.jsx"
import MyDogs from "./pages/MyDogs.jsx"
import Messages from "./pages/Messages.jsx"
import Applications from "./pages/Applications.jsx"
import BrowseDogs from "./pages/BrowseDogs.jsx"
import DogProfile from "./pages/DogProfile.jsx"
import Settings from "./pages/Settings.jsx"
import Layout from "./components/Layout.jsx"
import { ToastProvider } from "./context/ToastContext"
import { DataCacheProvider } from "./context/DataCacheContext"
import ApplicationForm from "./pages/ApplicationForm.jsx"
import Shelters from "./pages/Shelters.jsx"
import ShelterDetails from "./pages/ShelterDetails.jsx"
import Journal from "./pages/Journal.jsx"
import Quiz from "./pages/Quiz.jsx"
import QuizResults from "./pages/Quizresults.jsx"
import SavedDogs from "./pages/Saveddogs.jsx"
import AdminLogin from "./pages/AdminLogin.jsx"
import AdminDashboard from "./pages/AdminDashboard.jsx"
import AdminUsers from "./pages/AdminUsers.jsx"
import AdminApplications from "./pages/AdminApplications.jsx"
import AdminStories from "./pages/AdminStories.jsx"
import AdminDogs from "./pages/AdminDogs.jsx"
import Profile from "./pages/Profile.jsx"
import Resources from "./pages/Resources.jsx"
import VerifyEmail from "./pages/VerifyEmail.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <DataCacheProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/register-success" element={<RegisterSuccess />} />
        <Route path="/admin" element={<AdminLogin />} />

        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute><Layout><Journal /></Layout></ProtectedRoute>} />
        <Route path="/my-dogs" element={<ProtectedRoute><Layout><MyDogs /></Layout></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute><Layout><Applications /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/apply" element={<ProtectedRoute><Layout><ApplicationForm /></Layout></ProtectedRoute>} />
        <Route path="/quiz" element={<ProtectedRoute><Layout><Quiz /></Layout></ProtectedRoute>} />
        <Route path="/quiz-results" element={<ProtectedRoute><Layout><QuizResults /></Layout></ProtectedRoute>} />
        <Route path="/saved-dogs" element={<ProtectedRoute><Layout><SavedDogs /></Layout></ProtectedRoute>} />

        <Route path="/dogs/:id" element={<Layout><DogProfile /></Layout>} />
        <Route path="/browse-dogs" element={<Layout><BrowseDogs /></Layout>} />
        <Route path="/shelters" element={<Layout><Shelters /></Layout>} />
        <Route path="/shelters/:id" element={<Layout><ShelterDetails /></Layout>} />

        <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
        <Route path="/admin/applications" element={<AdminGuard><AdminApplications /></AdminGuard>} />
        <Route path="/admin/stories" element={<AdminGuard><AdminStories /></AdminGuard>} />
        <Route path="/admin/dogs" element={<AdminGuard><AdminDogs /></AdminGuard>} />

        <Route path="/resources" element={<Layout><Resources /></Layout>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </BrowserRouter>
  </DataCacheProvider>
  </ToastProvider>
)