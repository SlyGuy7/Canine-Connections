import React from "react";
import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import BrowseDogs from "./pages/BrowseDogs";
import Shelters from "./pages/Shelters";
import ShelterDetails from "./pages/ShelterDetails";
import MyDogs from "./pages/MyDogs";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/browse-dogs" element={<BrowseDogs />} />
      <Route path="/shelters" element={<Shelters />} />
      <Route path="/shelter-details" element={<ShelterDetails />} />
      <Route path="/my-dogs" element={<MyDogs />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="*" element={<div style={{padding: "50px"}}><h1>404: Page Not Found</h1><p>Check your URL path.</p></div>} />
    </Routes>
  );
}