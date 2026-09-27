// Post-registration confirmation page — shown after a successful account creation.
// Displays a 800ms loading state before revealing next-step instructions and a
// "Back to Home" link so the user can return and log in after verifying their email.
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../index.css";
import { MailOpen } from "lucide-react"

export default function RegisterSuccess() {
  // Brief loading delay prevents a jarring flash of the success content immediately after navigation.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ fontSize: '20px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '600px', width: '100%', padding: '50px', borderRadius: '30px', background: 'var(--card-bg)', border: '1px solid var(--border)', textAlign: 'center', boxShadow: '0 4px 20px rgba(47, 36, 29, 0.05)' }}>
        
        <div style={{ fontSize: '72px', marginBottom: '20px' }}><MailOpen size={16} /></div>

        <h1 style={{ color: 'var(--text-primary)', fontSize: '36px', marginBottom: '16px', fontWeight: '800' }}>
          Check Your Email
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '18px', lineHeight: '1.6', marginBottom: '32px' }}>
          We sent a verification link to your email address. Click it to activate your account and start your adoption journey.
        </p>

        <div style={{ textAlign: 'left', background: 'var(--bg-primary)', padding: '24px', borderRadius: '15px', marginBottom: '32px', border: '1px solid #fcedda' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '20px', margin: '0 0 16px 0', fontWeight: '700' }}>
            Next steps
          </h3>
          <ul style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: '1.8', paddingLeft: '24px', margin: 0 }}>
            <li>Open the email from Canine Connections.</li>
            <li>Click the <strong>Verify My Email</strong> button.</li>
            <li>Log in and start browsing dogs!</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexDirection: 'row' }}>
          <Link
            to="/"
            style={{ flex: 1, padding: '16px', fontSize: '18px', borderRadius: '12px', backgroundColor: '#d97706', color: 'white', textDecoration: 'none', fontWeight: 'bold' }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}