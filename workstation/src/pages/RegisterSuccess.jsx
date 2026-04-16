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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#fffaf5' }}>
        <p style={{ fontSize: '20px', color: '#6f5848', fontWeight: 'bold' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#fffaf5', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '600px', width: '100%', padding: '50px', borderRadius: '30px', background: 'white', border: '1px solid #efdfd1', textAlign: 'center', boxShadow: '0 4px 20px rgba(47, 36, 29, 0.05)' }}>
        
        <div style={{ fontSize: '72px', marginBottom: '20px' }}>✅</div>
        
        <h1 style={{ color: '#2f241d', fontSize: '36px', marginBottom: '16px', fontWeight: '800' }}>
          Account Created!
        </h1>
        
        <p style={{ color: '#6f5848', fontSize: '18px', lineHeight: '1.6', marginBottom: '32px' }}>
          Welcome to the family. Your account is now active, and you can begin your journey toward adopting a new best friend.
        </p>

        <div style={{ textAlign: 'left', background: '#fffaf5', padding: '24px', borderRadius: '15px', marginBottom: '32px', border: '1px solid #fcedda' }}>
          <h3 style={{ color: '#2f241d', fontSize: '20px', margin: '0 0 16px 0', fontWeight: '700' }}>
            What is next?
          </h3>
          <ul style={{ color: '#6f5848', fontSize: '16px', lineHeight: '1.8', paddingLeft: '24px', margin: 0 }}>
            <li>Browse available dogs in your area.</li>
            <li>Complete your adopter profile.</li>
            <li>Start a chat with shelter staff.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexDirection: 'row' }}>
          {/* Note: I left this as /landing, but you may want to change it to /login depending on your routing */}
          <Link 
            to="/landing" 
            style={{ flex: 1, padding: '16px', fontSize: '18px', borderRadius: '12px', backgroundColor: '#d97706', color: 'white', textDecoration: 'none', fontWeight: 'bold' }}
          >
            Login Now
          </Link>
          <Link 
            to="/landing" 
            style={{ flex: 1, padding: '16px', fontSize: '18px', borderRadius: '12px', background: 'white', border: '1px solid #d8c1af', color: '#2f241d', textDecoration: 'none', fontWeight: 'bold' }}
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}