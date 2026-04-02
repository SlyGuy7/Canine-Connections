import React from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

export default function NotFound() {
const navigate = useNavigate();

return (
<div className="success-container">
<div className="success-card">
<div className="icon-circle" style={{ backgroundColor: "#8b6f5b" }}>
<span style={{ fontSize: "30px" }}>🐾</span>
</div>
<h1 style={{ color: "#2f241d" }}>Lost the Trail</h1>
<p style={{ color: "#6f5848", marginBottom: "30px" }}>
The link you followed is broken. Return to the main portal to continue your search.
</p>
<button className="btn-primary" onClick={() => navigate("/")}>
Return Home
</button>
</div>
</div>
);
}