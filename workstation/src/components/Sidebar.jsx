import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-title">Canine Connections</div>
      
      <Link 
        to="/dashboard" 
        className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
      >
        Dashboard
      </Link>
      
      <Link 
        to="/browse-dogs" 
        className={`nav-link ${location.pathname === "/browse-dogs" ? "active" : ""}`}
      >
        Browse Dogs
      </Link>

      {/* The new Shelters tab */}
      <Link 
        to="/shelters" 
        className={`nav-link ${location.pathname === "/shelters" ? "active" : ""}`}
      >
        Shelters
      </Link>
      
      <Link 
        to="/my-dogs" 
        className={`nav-link ${location.pathname === "/my-dogs" ? "active" : ""}`}
      >
        My Dogs
      </Link>
      
      <Link 
        to="/applications" 
        className={`nav-link ${location.pathname === "/applications" ? "active" : ""}`}
      >
        Applications
      </Link>
      
      <Link 
        to="/messages" 
        className={`nav-link ${location.pathname === "/messages" ? "active" : ""}`}
      >
        Messages
      </Link>
      
      <button className="nav-link logout-btn">Log Out</button>
    </aside>
  );
}