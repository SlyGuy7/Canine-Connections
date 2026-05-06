import React, { Suspense, lazy } from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"
import "./index.css"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import AdminGuard from "./components/AdminGuard.jsx"
import Layout from "./components/Layout.jsx"
import { ToastProvider } from "./context/ToastContext"
import { DataCacheProvider } from "./context/DataCacheContext"

const Landing         = lazy(() => import("./pages/Landing.jsx"))
const RegisterSuccess = lazy(() => import("./pages/RegisterSuccess.jsx"))
const VerifyEmail     = lazy(() => import("./pages/VerifyEmail.jsx"))
const ResetPassword   = lazy(() => import("./pages/ResetPassword.jsx"))
const Dashboard       = lazy(() => import("./pages/Dashboard.jsx"))
const Journal         = lazy(() => import("./pages/Journal.jsx"))
const MyDogs          = lazy(() => import("./pages/MyDogs.jsx"))
const Messages        = lazy(() => import("./pages/Messages.jsx"))
const Applications    = lazy(() => import("./pages/Applications.jsx"))
const ApplicationForm = lazy(() => import("./pages/ApplicationForm.jsx"))
const Settings        = lazy(() => import("./pages/Settings.jsx"))
const Profile         = lazy(() => import("./pages/Profile.jsx"))
const Quiz            = lazy(() => import("./pages/Quiz.jsx"))
const QuizResults     = lazy(() => import("./pages/Quizresults.jsx"))
const SavedDogs       = lazy(() => import("./pages/Saveddogs.jsx"))
const BrowseDogs      = lazy(() => import("./pages/BrowseDogs.jsx"))
const DogProfile      = lazy(() => import("./pages/DogProfile.jsx"))
const Shelters        = lazy(() => import("./pages/Shelters.jsx"))
const ShelterDetails  = lazy(() => import("./pages/ShelterDetails.jsx"))
const Resources       = lazy(() => import("./pages/Resources.jsx"))
const SuccessStories  = lazy(() => import("./pages/SuccessStories.jsx"))
const AdminLogin      = lazy(() => import("./pages/AdminLogin.jsx"))
const AdminDashboard  = lazy(() => import("./pages/AdminDashboard.jsx"))
const AdminUsers      = lazy(() => import("./pages/AdminUsers.jsx"))
const AdminApplications = lazy(() => import("./pages/AdminApplications.jsx"))
const AdminStories    = lazy(() => import("./pages/AdminStories.jsx"))
const AdminDogs       = lazy(() => import("./pages/AdminDogs.jsx"))

function PageLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary)" }}>
      <div style={{ width: "36px", height: "36px", border: "3px solid #f3e8de", borderTopColor: "#d97706", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  )
}

const router = createBrowserRouter([
  { path: "/",               element: <Navigate to="/landing" replace /> },
  { path: "/landing",        element: <Landing /> },
  { path: "/register-success", element: <RegisterSuccess /> },
  { path: "/admin",          element: <AdminLogin /> },
  { path: "/verify-email",   element: <VerifyEmail /> },
  { path: "/reset-password", element: <ResetPassword /> },

  { path: "/dashboard",    element: <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute> },
  { path: "/journal",      element: <ProtectedRoute><Layout><Journal /></Layout></ProtectedRoute> },
  { path: "/my-dogs",      element: <ProtectedRoute><Layout><MyDogs /></Layout></ProtectedRoute> },
  { path: "/messages",     element: <ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute> },
  { path: "/applications", element: <ProtectedRoute><Layout><Applications /></Layout></ProtectedRoute> },
  { path: "/settings",     element: <ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute> },
  { path: "/profile",      element: <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute> },
  { path: "/apply",        element: <ProtectedRoute><Layout><ApplicationForm /></Layout></ProtectedRoute> },
  { path: "/quiz",         element: <ProtectedRoute><Layout><Quiz /></Layout></ProtectedRoute> },
  { path: "/quiz-results", element: <ProtectedRoute><Layout><QuizResults /></Layout></ProtectedRoute> },
  { path: "/saved-dogs",   element: <ProtectedRoute><Layout><SavedDogs /></Layout></ProtectedRoute> },

  { path: "/dogs/:id",     element: <Layout><DogProfile /></Layout> },
  { path: "/browse-dogs",  element: <Layout><BrowseDogs /></Layout> },
  { path: "/shelters",     element: <Layout><Shelters /></Layout> },
  { path: "/shelters/:id", element: <Layout><ShelterDetails /></Layout> },

  { path: "/admin/dashboard",    element: <AdminGuard><AdminDashboard /></AdminGuard> },
  { path: "/admin/users",        element: <AdminGuard><AdminUsers /></AdminGuard> },
  { path: "/admin/applications", element: <AdminGuard><AdminApplications /></AdminGuard> },
  { path: "/admin/stories",      element: <AdminGuard><AdminStories /></AdminGuard> },
  { path: "/admin/dogs",         element: <AdminGuard><AdminDogs /></AdminGuard> },

  { path: "/resources",       element: <Layout><Resources /></Layout> },
  { path: "/success-stories", element: <Layout><SuccessStories /></Layout> },
  { path: "*",          element: <Navigate to="/landing" replace /> },
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <DataCacheProvider>
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </DataCacheProvider>
  </ToastProvider>
)
