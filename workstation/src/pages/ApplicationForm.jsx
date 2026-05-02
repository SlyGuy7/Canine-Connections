import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";

function profileToFormDefaults() {
  const prefs = JSON.parse(localStorage.getItem("userProfile") || "{}").prefs || {};

  let residenceType = "Single Family Home";
  let yardType      = "No yard";
  if (prefs.homeType === "Apartment")          { residenceType = "Apartment";           yardType = "No yard"; }
  else if (prefs.homeType === "House with yard") { residenceType = "Single Family Home"; yardType = "Fenced yard"; }
  else if (prefs.homeType === "Farm / Rural")    { residenceType = "Single Family Home"; yardType = "Fenced yard"; }
  else if (prefs.homeType === "House without yard") { residenceType = "Single Family Home"; yardType = "No yard"; }

  const hoursMap = {
    "Less than 4 hours":     "Less than 4 hours per day",
    "4–8 hours":             "4–8 hours per day",
    "8–12 hours":            "8–12 hours per day",
    "Mostly home all day":   "Rarely alone — home most of the day",
  };

  const currentAnimals  = prefs.otherPets === "None" ? "None" : "";
  const hoursAlone      = hoursMap[prefs.hoursHome] || "";
  const allergies       = (prefs.allergies === "Yes — hypoallergenic only" || prefs.allergies === "Mild — prefer low-shedding") ? "Yes" : "No";
  const priorExperience = prefs.experience || "";

  return { residenceType, yardType, currentAnimals, hoursAlone, allergies, priorExperience };
}

const INPUT = {
  width: "100%", padding: "12px 14px", borderRadius: "10px",
  border: "1px solid #e5ddd6", fontSize: "15px", fontFamily: "'Inter', sans-serif",
  color: "#2f241d", outline: "none", boxSizing: "border-box", background: "white",
};
const SELECT = { ...INPUT, cursor: "pointer" };
const TEXTAREA = { ...INPUT, resize: "vertical" };

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#2f241d" }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionCard({ number, title, children }) {
  return (
    <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", overflow: "hidden" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #f5ede4", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#d97706", color: "white", fontSize: "13px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{number}</span>
        <span style={{ fontSize: "16px", fontWeight: "700", color: "#2f241d" }}>{title}</span>
      </div>
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {children}
      </div>
    </div>
  );
}

export default function ApplicationForm() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { addToast } = useToast();

  const [targetDog, setTargetDog]   = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const hasLoaded = useRef(false);

  const defaults = profileToFormDefaults();

  const [formData, setFormData] = useState({
    firstName:          localStorage.getItem("userFirstName") || "",
    lastName:           localStorage.getItem("userLastName")  || "",
    email:              localStorage.getItem("userEmail")     || "",
    phone:              localStorage.getItem("userPhone")   || "",
    address:            localStorage.getItem("userAddress") || "",
    householdSize:      "",
    hasChildren:        "No",
    currentAnimals:     defaults.currentAnimals,
    residenceType:      defaults.residenceType,
    yardType:           defaults.yardType,
    hoursAlone:         defaults.hoursAlone,
    handlingDestruction: "",
    adjustmentPeriod:   "",
    allergies:          defaults.allergies,
    priorExperience:    defaults.priorExperience,
    agreeToHomeVisit:   false,
    agreeToFee:         false,
  });

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const dogId   = location.state?.dogId   || localStorage.getItem("pendingApplicationDogId");
    const dogName = location.state?.dogName || localStorage.getItem("pendingApplicationDogName");

    if (!dogId) {
      addToast("No dog selected for application.", "error");
      navigate("/browse-dogs");
      return;
    }

    setTargetDog({ dog_id: dogId, name: dogName || "Selected Dog" });
    sendMessage("request.dogs.get", { dog_id: dogId })
      .then(result => { if (result?.success && result.dog) setTargetDog(result.dog); })
      .catch(() => {});
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const focusStyle = name => name === focusedField ? { border: "1.5px solid #d97706" } : {};

  const handleOpenReview = e => {
    e.preventDefault();
    const { firstName, lastName, email, phone, address, householdSize, hoursAlone, handlingDestruction, adjustmentPeriod } = formData;
    if (!firstName || !lastName || !email || !phone || !address || !householdSize || !hoursAlone || !handlingDestruction || !adjustmentPeriod) {
      addToast("Please fill in all required fields before reviewing.", "error");
      return;
    }
    if (!formData.agreeToHomeVisit || !formData.agreeToFee) {
      addToast("Please agree to all terms before reviewing.", "error");
      return;
    }
    setShowReview(true);
  };

  const handleFinalSubmit = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) { addToast("You must be logged in to submit an application.", "error"); return; }

    setSubmitting(true);
    try {
      const result = await sendMessage("request.application.submit", {
        user_id:                userId,
        dog_id:                 targetDog.dog_id,
        full_name:              `${formData.firstName} ${formData.lastName}`,
        phone:                  formData.phone,
        address:                formData.address,
        housing_type:           ({ "Single Family Home": "house", "Apartment": "apartment", "Condo / Townhouse": "condo" }[formData.residenceType] || "other"),
        has_yard:               formData.yardType !== "No yard",
        has_other_pets:         formData.currentAnimals.trim().toLowerCase() !== "none" && formData.currentAnimals.trim() !== "",
        other_pets_description: formData.currentAnimals,
        has_children:           formData.hasChildren !== "No",
        prior_pet_experience:   formData.priorExperience,
        reason_for_adopting:    formData.adjustmentPeriod,
        email:                  formData.email,
        first_name:             formData.firstName,
        dog_name:               targetDog.name,
      });

      if (result?.success) {
        localStorage.removeItem("pendingApplicationDogId");
        localStorage.removeItem("pendingApplicationDogName");
        addToast("Application submitted successfully!", "success");
        navigate("/applications");
      } else {
        addToast(result?.error || "Submission failed. Please try again.", "error");
      }
    } catch {
      addToast("Network error. Could not submit application.", "error");
    } finally {
      setSubmitting(false);
      setShowReview(false);
    }
  };

  if (!targetDog) return null;

  const photos = targetDog.photos
    ? (Array.isArray(targetDog.photos)
        ? targetDog.photos.map(p => p.photo_url).filter(Boolean)
        : targetDog.photos.split(",").map(p => p.trim()).filter(Boolean))
    : [];

  const profileFilled = Object.values(profileToFormDefaults()).some(v => v && v !== "No" && v !== "Single Family Home" && v !== "No yard");

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 0 100px 0", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <button onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px", padding: "9px 18px", borderRadius: "10px", border: "1px solid #efdfd1", background: "white", color: "#6f5848", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Adoption Application</h1>
        <p style={{ margin: 0, color: "#9c7e6a", fontSize: "15px" }}>Complete all required fields to apply for adoption.</p>
      </div>

      {/* Profile pre-fill notice */}
      {profileFilled && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "14px", padding: "12px 18px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>👤</span>
          <span style={{ fontSize: "13px", color: "#92400e" }}>
            Some fields have been pre-filled from your profile. Review and adjust as needed.
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "28px", alignItems: "start" }}>

        {/* ── Form ── */}
        <form onSubmit={handleOpenReview} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <SectionCard number="1" title="Contact Information">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="First Name" required>
                <input required name="firstName" value={formData.firstName} onChange={handleChange}
                  onFocus={() => setFocusedField("firstName")} onBlur={() => setFocusedField(null)}
                  style={{ ...INPUT, ...focusStyle("firstName") }} />
              </Field>
              <Field label="Last Name" required>
                <input required name="lastName" value={formData.lastName} onChange={handleChange}
                  onFocus={() => setFocusedField("lastName")} onBlur={() => setFocusedField(null)}
                  style={{ ...INPUT, ...focusStyle("lastName") }} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Email" required>
                <input required type="email" name="email" value={formData.email} onChange={handleChange}
                  onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)}
                  style={{ ...INPUT, ...focusStyle("email") }} />
              </Field>
              <Field label="Phone" required>
                <input required name="phone" value={formData.phone} onChange={handleChange}
                  onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)}
                  maxLength={20} placeholder="e.g. (555) 123-4567"
                  style={{ ...INPUT, ...focusStyle("phone") }} />
              </Field>
            </div>
            <Field label="Home Address" required>
              <input required name="address" value={formData.address} onChange={handleChange}
                onFocus={() => setFocusedField("address")} onBlur={() => setFocusedField(null)}
                style={{ ...INPUT, ...focusStyle("address") }} />
            </Field>
          </SectionCard>

          <SectionCard number="2" title="Your Household">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Number of people in the household" required>
                <select required name="householdSize" value={formData.householdSize} onChange={handleChange} style={SELECT}>
                  <option value="">Select…</option>
                  <option>1 — just me</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5 or more</option>
                </select>
              </Field>
              <Field label="Are there children in the household?" required>
                <select name="hasChildren" value={formData.hasChildren} onChange={handleChange} style={SELECT}>
                  <option value="No">No</option>
                  <option value="Yes — under 5">Yes — under 5</option>
                  <option value="Yes — ages 5 to 12">Yes — ages 5 to 12</option>
                  <option value="Yes — teenagers">Yes — teenagers (13+)</option>
                </select>
              </Field>
            </div>
            <Field label="Current pets — species, breed, age (or None)" required>
              <textarea required name="currentAnimals" value={formData.currentAnimals} onChange={handleChange} rows="3"
                onFocus={() => setFocusedField("currentAnimals")} onBlur={() => setFocusedField(null)}
                placeholder="e.g. Golden Retriever, 3 yrs — or None"
                style={{ ...TEXTAREA, ...focusStyle("currentAnimals") }} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Residence type" required>
                <select name="residenceType" value={formData.residenceType} onChange={handleChange} style={SELECT}>
                  <option>Single Family Home</option>
                  <option>Apartment</option>
                  <option>Condo / Townhouse</option>
                </select>
              </Field>
              <Field label="Outdoor space" required>
                <select name="yardType" value={formData.yardType} onChange={handleChange} style={SELECT}>
                  <option>Fenced yard</option>
                  <option>Open yard</option>
                  <option>No yard</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard number="3" title="Care & Lifestyle">
            <Field label="How many hours per day would the dog be alone?" required>
              <input required name="hoursAlone" value={formData.hoursAlone} onChange={handleChange}
                onFocus={() => setFocusedField("hoursAlone")} onBlur={() => setFocusedField(null)}
                placeholder="e.g. 4–6 hours on weekdays"
                style={{ ...INPUT, ...focusStyle("hoursAlone") }} />
            </Field>
            <Field label="How would you handle destructive behavior?" required>
              <textarea required name="handlingDestruction" value={formData.handlingDestruction} onChange={handleChange} rows="3"
                onFocus={() => setFocusedField("handlingDestruction")} onBlur={() => setFocusedField(null)}
                placeholder="Describe your approach to training and correction..."
                style={{ ...TEXTAREA, ...focusStyle("handlingDestruction") }} />
            </Field>
            <Field label="Are you prepared for an adjustment period? What does that look like for you?" required>
              <textarea required name="adjustmentPeriod" value={formData.adjustmentPeriod} onChange={handleChange} rows="3"
                onFocus={() => setFocusedField("adjustmentPeriod")} onBlur={() => setFocusedField(null)}
                placeholder="Describe how you would help the dog settle in..."
                style={{ ...TEXTAREA, ...focusStyle("adjustmentPeriod") }} />
            </Field>
            <Field label="Any pet allergies in the household?" required>
              <select name="allergies" value={formData.allergies} onChange={handleChange} style={SELECT}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </Field>
          </SectionCard>

          <SectionCard number="4" title="Agreements">
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { name: "agreeToHomeVisit", text: "I agree to a home visit if requested by the shelter" },
                { name: "agreeToFee",       text: "I understand that an adoption fee may apply" },
              ].map(({ name, text }) => (
                <label key={name} style={{ display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", padding: "14px 18px", borderRadius: "12px", border: `1px solid ${formData[name] ? "#d97706" : "#e5ddd6"}`, background: formData[name] ? "#fff7ed" : "white", transition: "all 0.15s" }}>
                  <input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} style={{ width: "18px", height: "18px", accentColor: "#d97706", flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", fontWeight: "500", color: formData[name] ? "#92400e" : "#2f241d" }}>{text} <span style={{ color: "#ef4444" }}>*</span></span>
                </label>
              ))}
            </div>
          </SectionCard>

          <button
            type="submit"
            style={{ width: "100%", padding: "16px", borderRadius: "14px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 16px rgba(217,119,6,0.28)" }}
          >
            Review Application →
          </button>
        </form>

        {/* ── Dog sidebar ── */}
        <div style={{ position: "sticky", top: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1" }}>
            {photos[0]
              ? <img src={photos[0]} alt={targetDog.name} style={{ width: "100%", height: "180px", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "140px", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "52px" }}>🐕</div>
            }
            <div style={{ padding: "18px 20px" }}>
              <p style={{ margin: "0 0 2px 0", fontSize: "11px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Applying for</p>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "800", color: "#2f241d" }}>{targetDog.name}</h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#d97706", fontWeight: "600" }}>{targetDog.breed}</p>
            </div>
          </div>

          <div style={{ background: "#fffaf5", border: "1px solid #efdfd1", borderRadius: "16px", padding: "16px 18px" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>What happens next</p>
            <ol style={{ margin: 0, paddingLeft: "18px", color: "#6f5848", fontSize: "13px", lineHeight: "2" }}>
              <li>Review your answers</li>
              <li>Submit the application</li>
              <li>Shelter reviews within 3–5 days</li>
              <li>Schedule a meet &amp; greet</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Review modal ── */}
      {showReview && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowReview(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(47,36,29,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
        >
          <div style={{ background: "white", borderRadius: "24px", maxWidth: "580px", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>

            {/* Modal header */}
            <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid #f5ede4" }}>
              <h2 style={{ margin: "0 0 4px 0", fontSize: "22px", fontWeight: "800", color: "#2f241d" }}>Confirm Your Application</h2>
              <p style={{ margin: 0, color: "#9c7e6a", fontSize: "14px" }}>Applying for <strong style={{ color: "#2f241d" }}>{targetDog.name}</strong> — review before submitting</p>
            </div>

            {/* Summary */}
            <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Full name",     value: `${formData.firstName} ${formData.lastName}` },
                { label: "Email",         value: formData.email },
                { label: "Phone",         value: formData.phone },
                { label: "Address",       value: formData.address },
                { label: "Household size", value: formData.householdSize },
                { label: "Children",      value: formData.hasChildren },
                { label: "Current pets",  value: formData.currentAnimals },
                { label: "Residence",     value: `${formData.residenceType} — ${formData.yardType}` },
                { label: "Hours alone",   value: formData.hoursAlone },
                { label: "Allergies",     value: formData.allergies },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", gap: "12px", padding: "10px 14px", borderRadius: "10px", background: "#fffaf5", border: "1px solid #f5ede4" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#9c7e6a", width: "110px", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: "13px", color: "#2f241d", wordBreak: "break-word" }}>{value || <em style={{ color: "#a8a29e" }}>—</em>}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ padding: "20px 32px 28px", display: "flex", gap: "12px" }}>
              <button onClick={() => setShowReview(false)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid #e5ddd6", background: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer", color: "#2f241d" }}>
                ← Edit
              </button>
              <button onClick={handleFinalSubmit} disabled={submitting} style={{ flex: 2, padding: "14px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 12px rgba(217,119,6,0.3)", opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
