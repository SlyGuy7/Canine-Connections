import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../index.css";

export default function RegisterSuccess() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="success-container fade-in">
      <div className="success-card">
        <div className="icon-circle pop-in">
          <i className="fas fa-check"></i>
        </div>
        <h1>Account Created!</h1>
        <p>
          Welcome to the family. Your account is now active, and you can begin
          your journey toward adopting a new best friend.
        </p>

        <div className="next-steps">
          <h3>What is next?</h3>
          <ul>
            <li>Browse available dogs in your area.</li>
            <li>Complete your adopter profile.</li>
            <li>Start a chat with shelter staff.</li>
          </ul>
        </div>

        <div className="button-group">
          <Link to="/landing" className="btn-primary">
            Login Now
          </Link>
          <Link to="/landing" className="btn-secondary">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}