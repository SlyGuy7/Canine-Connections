// 404 fallback page — renders when no route matches. Reuses the .success-container and
// .success-card CSS classes from index.css rather than defining its own layout.
import React from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";
import { PawPrint } from "lucide-react"

export default function NotFound() {
const navigate = useNavigate();

return (
<div className="success-container">
<div className="success-card">
<div className="icon-circle" style={{ backgroundColor: "#8b6f5b" }}>
<span style={{ fontSize: "30px" }}><PawPrint size={24} strokeWidth={1.5} /></span>
</div>
<h1 style={{ color: "var(--text-primary)" }}>Lost the Trail</h1>
<p style={{ color: "var(--text-muted)", marginBottom: "30px" }}>
The link you followed is broken. Return to the main portal to continue your search.
</p>
<button className="btn-primary" onClick={() => navigate("/")}>
Return Home
</button>
</div>
</div>
);
}