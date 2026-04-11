import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";
import Sidebar from "../components/Sidebar";

export default function ApplicationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [targetDog, setTargetDog] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasLoaded = useRef(false);

  const [formData, setFormData] = useState({
    firstName: localStorage.getItem("userFirstName") || "",
    lastName: localStorage.getItem("userLastName") || "",
    email: localStorage.getItem("userEmail") || "",
    phone: "",
    address: "",
    householdMembers: "",
    currentAnimals: "",
    residenceType: "Single Family Home",
    yardType: "Fenced yard",
    hoursAlone: "",
    handlingDestruction: "",
    adjustmentPeriod: "",
    allergies: "No",
    agreeToHomeVisit: false,
    agreeToFee: false,
  });

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const dogId = location.state?.dogId || localStorage.getItem("pendingApplicationDogId");
    const dogName = location.state?.dogName || localStorage.getItem("pendingApplicationDogName");

    if (!dogId) {
      addToast("No dog selected for application.", "error");
      navigate("/browse-dogs");
      return;
    }

    setTargetDog({ dog_id: dogId, name: dogName || "Selected Dog" });

    sendMessage("request.dogs.get", { dog_id: dogId })
      .then((result) => {
        if (result?.success && result.dog) {
          setTargetDog(result.dog);
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleOpenReview = (e) => {
    e.preventDefault();
    if (!formData.agreeToHomeVisit || !formData.agreeToFee) {
      addToast("Please agree to all terms before reviewing.", "error");
      return;
    }
    setShowReview(true);
  };

  const handleFinalSubmit = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      addToast("You must be logged in to submit an application.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const result = await sendMessage("request.application.submit", {
        user_id: userId,
        dog_id: targetDog.dog_id,
        full_name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        address: formData.address,
        housing_type: formData.residenceType,
        has_yard: formData.yardType !== "No yard",
        has_other_pets: formData.currentAnimals.trim() !== "",
        other_pets_description: formData.currentAnimals,
        has_children: formData.householdMembers.toLowerCase().includes("child") ||
                      formData.householdMembers.toLowerCase().includes("kid"),
        prior_pet_experience: formData.currentAnimals,
        reason_for_adopting: formData.adjustmentPeriod,
        email: formData.email,
        first_name: formData.firstName,
        dog_name: targetDog.name,
      });

      if (result?.success) {
        localStorage.removeItem("pendingApplicationDogId");
        localStorage.removeItem("pendingApplicationDogName");
        addToast("Application submitted successfully!", "success");
        navigate("/applications");
      } else {
        addToast(result?.error || "Submission failed. Please try again.", "error");
      }
    } catch (err) {
      addToast("Network error. Could not submit application.", "error");
    } finally {
      setSubmitting(false);
      setShowReview(false);
    }
  };

  const RequiredLabel = ({ text }) => (
    <label style={{ display: "block", marginBottom: "12px", fontWeight: "700", fontSize: "18px", color: "#2f241d" }}>
      {text} <span style={{ color: "#ef4444" }}>*</span>
    </label>
  );

  if (!targetDog) return null;

  const photos = targetDog.photos
    ? (Array.isArray(targetDog.photos)
        ? targetDog.photos.map((p) => p.photo_url).filter(Boolean)
        : targetDog.photos.split(",").map((p) => p.trim()).filter(Boolean))
    : [];

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container" style={{ paddingBottom: "100px" }}>
        <header style={{ marginBottom: "32px" }}>
          <button onClick={() => navigate(-1)} style={{ border: "none", background: "none", cursor: "pointer", color: "#6f5848", fontWeight: "bold" }}>
            ← Back
          </button>
          <h1 style={{ fontSize: "36px", marginTop: "16px", color: "#2f241d" }}>Adoption Application</h1>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "32px", alignItems: "start" }}>
          <div className="panel" style={{ padding: "40px", borderRadius: "24px", background: "white" }}>
            <p style={{ color: "#ef4444", fontSize: "14px", fontWeight: "700", marginBottom: "40px" }}>* Required</p>

            <form onSubmit={handleOpenReview} style={{ display: "flex", flexDirection: "column", gap: "40px" }}>

              <section>
                <h2 style={{ fontSize: "22px", color: "#d97706", borderBottom: "2px solid #fcedda", paddingBottom: "10px", marginBottom: "24px" }}>1. Contact Information</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <RequiredLabel text="First Name" />
                    <input required name="firstName" value={formData.firstName} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7" }} />
                  </div>
                  <div>
                    <RequiredLabel text="Last Name" />
                    <input required name="lastName" value={formData.lastName} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <RequiredLabel text="Email" />
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7" }} />
                  </div>
                  <div>
                    <RequiredLabel text="Phone" />
                    <input required name="phone" value={formData.phone} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7" }} />
                  </div>
                </div>
                <RequiredLabel text="Address" />
                <input required name="address" value={formData.address} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7" }} />
              </section>

              <section>
                <h2 style={{ fontSize: "22px", color: "#d97706", borderBottom: "2px solid #fcedda", paddingBottom: "10px", marginBottom: "24px" }}>2. Household</h2>
                <RequiredLabel text="Household Members (Names and Ages)" />
                <textarea required name="householdMembers" value={formData.householdMembers} onChange={handleChange} rows="3" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7", marginBottom: "20px" }} />
                <RequiredLabel text="Current Pets (Species, Breed, Age — or None)" />
                <textarea required name="currentAnimals" value={formData.currentAnimals} onChange={handleChange} rows="3" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7", marginBottom: "20px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <RequiredLabel text="Residence Type" />
                    <select name="residenceType" value={formData.residenceType} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7", background: "white" }}>
                      <option>Single Family Home</option>
                      <option>Apartment</option>
                      <option>Condo/Townhouse</option>
                    </select>
                  </div>
                  <div>
                    <RequiredLabel text="Yard Type" />
                    <select name="yardType" value={formData.yardType} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7", background: "white" }}>
                      <option>Fenced yard</option>
                      <option>Open yard</option>
                      <option>No yard</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h2 style={{ fontSize: "22px", color: "#d97706", borderBottom: "2px solid #fcedda", paddingBottom: "10px", marginBottom: "24px" }}>3. Care & Behavior</h2>
                <RequiredLabel text="Hours alone daily?" />
                <input required name="hoursAlone" value={formData.hoursAlone} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7", marginBottom: "20px" }} />
                <RequiredLabel text="How would you handle destructive behavior?" />
                <textarea required name="handlingDestruction" value={formData.handlingDestruction} onChange={handleChange} rows="3" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7", marginBottom: "20px" }} />
                <RequiredLabel text="Are you prepared for an adjustment period?" />
                <input required name="adjustmentPeriod" value={formData.adjustmentPeriod} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7", marginBottom: "20px" }} />
                <RequiredLabel text="Any pet allergies in the home?" />
                <select name="allergies" value={formData.allergies} onChange={handleChange} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #dcc8b7", background: "white" }}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </section>

              <section>
                <h2 style={{ fontSize: "22px", color: "#d97706", borderBottom: "2px solid #fcedda", paddingBottom: "10px", marginBottom: "24px" }}>4. Agreements</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                    <input type="checkbox" name="agreeToHomeVisit" checked={formData.agreeToHomeVisit} onChange={handleChange} style={{ width: "20px", height: "20px" }} />
                    <span>I agree to a home visit if requested <span style={{ color: "#ef4444" }}>*</span></span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                    <input type="checkbox" name="agreeToFee" checked={formData.agreeToFee} onChange={handleChange} style={{ width: "20px", height: "20px" }} />
                    <span>I understand an adoption fee applies <span style={{ color: "#ef4444" }}>*</span></span>
                  </label>
                </div>
              </section>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "18px", fontSize: "18px", borderRadius: "12px" }}>
                Review Application
              </button>
            </form>
          </div>

          <div style={{ position: "sticky", top: "24px" }}>
            <div style={{ background: "white", borderRadius: "20px", padding: "24px", border: "1px solid #efdfd1", textAlign: "center" }}>
              {photos[0] ? (
                <img src={photos[0]} alt={targetDog.name} style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "12px", marginBottom: "16px" }} />
              ) : (
                <div style={{ width: "100%", height: "120px", background: "#fcedda", borderRadius: "12px", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>🐕</div>
              )}
              <h3 style={{ margin: "0 0 6px 0", fontSize: "20px" }}>{targetDog.name}</h3>
              <p style={{ color: "#d97706", fontWeight: "700", fontSize: "14px", margin: 0 }}>{targetDog.breed}</p>
            </div>
          </div>
        </div>

        {showReview && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(47,36,29,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
            <div style={{ background: "white", padding: "40px", borderRadius: "24px", maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
              <h2 style={{ marginBottom: "8px", color: "#2f241d" }}>Confirm Submission</h2>
              <p style={{ color: "#6f5848", marginBottom: "24px" }}>Applying for <strong>{targetDog.name}</strong></p>
              <div style={{ background: "#fffaf5", padding: "24px", borderRadius: "16px", marginBottom: "24px", fontSize: "15px", lineHeight: "1.8", border: "1px solid #efdfd1" }}>
                <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Phone:</strong> {formData.phone}</p>
                <p><strong>Address:</strong> {formData.address}</p>
                <p><strong>Household:</strong> {formData.householdMembers}</p>
                <p><strong>Current Pets:</strong> {formData.currentAnimals}</p>
                <p><strong>Residence:</strong> {formData.residenceType} — {formData.yardType}</p>
                <p><strong>Hours alone:</strong> {formData.hoursAlone}</p>
                <p><strong>Allergies:</strong> {formData.allergies}</p>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <button onClick={() => setShowReview(false)} style={{ flex: 1, padding: "16px", borderRadius: "12px", border: "1px solid #dcc8b7", background: "white", cursor: "pointer", fontWeight: "bold" }}>
                  Edit
                </button>
                <button onClick={handleFinalSubmit} disabled={submitting} style={{ flex: 1, padding: "16px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "bold", cursor: "pointer" }}>
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}