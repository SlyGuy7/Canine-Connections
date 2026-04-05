import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";

export default function ApplicationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const hasCheckedDog = useRef(false);
  const [targetDog, setTargetDog] = useState(null);
  const [showReview, setShowReview] = useState(false);

  const [formData, setFormData] = useState({
    email: localStorage.getItem("userEmail") || "",
    lastName: localStorage.getItem("userLastName") || "",
    firstName: localStorage.getItem("userFirstName") || "",
    address: "",
    cityStateZip: "",
    phone: "",
    hearAboutUs: "",
    householdMembers: "",
    currentAnimals: "",
    residenceType: "Single Family Home",
    yardType: "Fenced yard",
    noiseLevel: "Medium",
    hoursAlone: "",
    timeSpentLocation: "Loose in house",
    handlingDestruction: "",
    adjustmentPeriod: "",
    allergies: "No",
    agreeToHomeVisit: false,
    agreeToFee: false
  });

  useEffect(() => {
    if (hasCheckedDog.current) return;
    const dogId = location.state?.dogId || localStorage.getItem("pendingApplicationDogId");

    if (!dogId) {
      if (!targetDog) {
        addToast("No dog selected", "error");
        navigate("/browse-dogs");
      }
      return;
    }

    const fallbackDogs = [
      { id: 1, name: "Buddy", breed: "Labrador Mix", shelter: "Canine Connections" },
      { id: 2, name: "Luna", breed: "Golden Retriever", shelter: "Canine Connections" },
      { id: 3, name: "Max", breed: "Beagle", shelter: "Canine Connections" }
    ];

    const foundDog = fallbackDogs.find((d) => d.id.toString() === dogId.toString());
    if (foundDog) {
      setTargetDog(foundDog);
      hasCheckedDog.current = true;
    } else if (location.state?.dogName) {
      setTargetDog({ id: dogId, name: location.state.dogName, breed: "Companion", shelter: "Canine Connections" });
      hasCheckedDog.current = true;
    }
  }, [navigate, addToast, location, targetDog]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleOpenReview = (e) => {
    e.preventDefault();
    if (!formData.agreeToHomeVisit || !formData.agreeToFee) {
      addToast("Please agree to the final terms", "error");
      return;
    }
    setShowReview(true);
  };

  const handleFinalSubmit = () => {
    const apps = JSON.parse(localStorage.getItem("myApplications") || "[]");
    const newApp = {
      id: Date.now(),
      dog: targetDog.name,
      breed: targetDog.breed,
      shelter: targetDog.shelter,
      status: "Pending",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      applicantName: `${formData.firstName} ${formData.lastName}`
    };
    apps.push(newApp);
    localStorage.setItem("myApplications", JSON.stringify(apps));
    localStorage.removeItem("pendingApplicationDogId");
    addToast("Application submitted successfully", "success");
    navigate("/applications");
  };

  const RequiredLabel = ({ text }) => (
    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '700', fontSize: '18px', color: '#2f241d' }}>
      {text} <span style={{ color: '#ef4444' }}>*</span>
    </label>
  );

  const sectionStyle = { marginBottom: '60px' };

  if (!targetDog) return null;

  return (
    <div className="page-container" style={{ backgroundColor: '#fffaf5', minHeight: '100vh', paddingBottom: '100px' }}>
      <header style={{ marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6f5848', fontWeight: 'bold' }}>
          ← Back to Profile
        </button>
        <h1 style={{ fontSize: '42px', marginTop: '16px', color: '#2f241d' }}>Canine Connections Adoption Form</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px', alignItems: 'start' }}>
        <div className="panel" style={{ padding: '50px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', background: 'white' }}>
          
          <p style={{ color: '#ef4444', fontSize: '16px', fontWeight: '700', marginBottom: '60px' }}>* Required</p>

          <form onSubmit={handleOpenReview} style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
            
            <section>
              <h2 style={{ fontSize: '24px', color: '#d97706', borderBottom: '2px solid #fcedda', paddingBottom: '12px', marginBottom: '32px' }}>1. Adoption Interest</h2>
              <div style={{ padding: '14px', borderRadius: '10px', background: '#fffaf5', border: '1px solid #dcc8b7', color: '#6f5848', fontWeight: '600' }}>
                Applying for: {targetDog.name} ({targetDog.breed})
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '24px', color: '#d97706', borderBottom: '2px solid #fcedda', paddingBottom: '12px', marginBottom: '32px' }}>2. Contact Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                <div className="input-group">
                  <RequiredLabel text="First Name" />
                  <input required name="firstName" value={formData.firstName} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7' }} />
                </div>
                <div className="input-group">
                  <RequiredLabel text="Last Name" />
                  <input required name="lastName" value={formData.lastName} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                <div className="input-group">
                  <RequiredLabel text="Email" />
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7' }} />
                </div>
                <div className="input-group">
                  <RequiredLabel text="Phone Number" />
                  <input required name="phone" value={formData.phone} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7' }} />
                </div>
              </div>
              <RequiredLabel text="Address, City, State, Zip" />
              <input required name="address" value={formData.address} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7' }} />
            </section>

            <section>
              <h2 style={{ fontSize: '24px', color: '#d97706', borderBottom: '2px solid #fcedda', paddingBottom: '12px', marginBottom: '32px' }}>3. Household Details</h2>
              <RequiredLabel text="Household Members (Names and Ages)" />
              <textarea required name="householdMembers" value={formData.householdMembers} onChange={handleChange} rows="3" style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7', marginBottom: '30px' }}></textarea>
              
              <RequiredLabel text="Current Pets (Species, Breed, Age)" />
              <textarea required name="currentAnimals" value={formData.currentAnimals} onChange={handleChange} rows="3" style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7', marginBottom: '30px' }}></textarea>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div className="input-group">
                  <RequiredLabel text="Residence Type" />
                  <select name="residenceType" value={formData.residenceType} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7', background: 'white' }}>
                    <option value="Single Family Home">Single Family Home</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Condo/Townhouse">Condo/Townhouse</option>
                  </select>
                </div>
                <div className="input-group">
                  <RequiredLabel text="Yard Type" />
                  <select name="yardType" value={formData.yardType} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7', background: 'white' }}>
                    <option value="Fenced yard">Fenced yard</option>
                    <option value="Open yard">Open yard</option>
                    <option value="No yard">No yard</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '24px', color: '#d97706', borderBottom: '2px solid #fcedda', paddingBottom: '12px', marginBottom: '32px' }}>4. Care & Behavior</h2>
              <RequiredLabel text="Hours alone daily?" />
              <input required name="hoursAlone" value={formData.hoursAlone} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7', marginBottom: '30px' }} />

              <RequiredLabel text="Handling destructive behaviors?" />
              <textarea required name="handlingDestruction" value={formData.handlingDestruction} onChange={handleChange} rows="3" style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7', marginBottom: '30px' }}></textarea>

              <RequiredLabel text="Willing adjustment period?" />
              <input required name="adjustmentPeriod" value={formData.adjustmentPeriod} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7', marginBottom: '30px' }} />

              <RequiredLabel text="Any pet allergies in home?" />
              <select name="allergies" value={formData.allergies} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #dcc8b7', background: 'white' }}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </section>

            <section>
              <h2 style={{ fontSize: '24px', color: '#d97706', borderBottom: '2px solid #fcedda', paddingBottom: '12px', marginBottom: '32px' }}>5. Agreements</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                  {/* Added 'required' below */}
                  <input required type="checkbox" name="agreeToHomeVisit" checked={formData.agreeToHomeVisit} onChange={handleChange} style={{ width: '22px', height: '22px' }} />
                  <span>I agree to a home visit if requested <span style={{ color: '#ef4444' }}>*</span></span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                  {/* Added 'required' below */}
                  <input required type="checkbox" name="agreeToFee" checked={formData.agreeToFee} onChange={handleChange} style={{ width: '22px', height: '22px' }} />
                  <span>I understand an adoption fee applies <span style={{ color: '#ef4444' }}>*</span></span>
                </label>
              </div>
            </section>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '20px', fontSize: '20px', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold' }}>
              Review Application
            </button>
          </form>
        </div>

        <div style={{ position: 'sticky', top: '24px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '30px', border: '1px solid #efdfd1', textAlign: 'center' }}>
            <div style={{ width: '100px', height: '100px', background: '#fcedda', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🐕</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '22px' }}>{targetDog.name}</h3>
            <p style={{ color: '#d97706', fontWeight: '700', fontSize: '16px' }}>{targetDog.breed}</p>
          </div>
        </div>
      </div>

      {showReview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(47, 36, 29, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '24px', maxWidth: '650px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <h2 style={{ marginBottom: '12px', color: '#2f241d', fontSize: '28px' }}>Confirm Submission</h2>
            <p style={{ color: '#6f5848', marginBottom: '24px', fontSize: '15px' }}>Please review your full details before submitting your application for <strong>{targetDog.name}</strong>.</p>
            
            <div style={{ background: '#fffaf5', padding: '32px', borderRadius: '16px', marginBottom: '32px', fontSize: '15px', lineHeight: '1.8', border: '1px solid #efdfd1' }}>
              
              <h3 style={{ fontSize: '18px', color: '#2f241d', marginBottom: '10px' }}>1. Personal Details</h3>
              <div style={{ paddingLeft: '15px', marginBottom: '25px', color: '#6f5848' }}>
                <p>Name: {formData.firstName} {formData.lastName}</p>
                <p>Email: {formData.email}</p>
                <p>Phone: {formData.phone}</p>
                <p>Address: {formData.address}, {formData.cityStateZip}</p>
              </div>

              <h3 style={{ fontSize: '18px', color: '#2f241d', marginBottom: '10px' }}>2. Household & Pets</h3>
              <div style={{ paddingLeft: '15px', marginBottom: '25px', color: '#6f5848' }}>
                <p>Household Members: {formData.householdMembers}</p>
                <p>Current Animals: {formData.currentAnimals}</p>
                <p>Residence: {formData.residenceType} ({formData.yardType})</p>
              </div>

              <h3 style={{ fontSize: '18px', color: '#2f241d', marginBottom: '10px' }}>3. Care Plan</h3>
              <div style={{ paddingLeft: '15px', marginBottom: '25px', color: '#6f5848' }}>
                <p>Hours Alone: {formData.hoursAlone}</p>
                <p>Location when alone: {formData.timeSpentLocation}</p>
                <p>Allergies in home: {formData.allergies}</p>
              </div>

              <h3 style={{ fontSize: '18px', color: '#2f241d', marginBottom: '10px' }}>4. Behavior & Adjustment</h3>
              <div style={{ paddingLeft: '15px', marginBottom: '25px', color: '#6f5848' }}>
                <p>Adjustment Period: {formData.adjustmentPeriod}</p>
                <p>Dealing with Destruction: {formData.handlingDestruction}</p>
              </div>

              <h3 style={{ fontSize: '18px', color: '#2f241d', marginBottom: '10px' }}>5. Legal Agreements</h3>
              <div style={{ paddingLeft: '15px', color: '#d97706', fontWeight: 'bold' }}>
                <p>✓ Confirmed agreement to Home Visit</p>
                <p>✓ Confirmed agreement to Adoption Fee</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <button 
                onClick={() => setShowReview(false)} 
                style={{ flex: 1, padding: '18px', borderRadius: '12px', border: '1px solid #dcc8b7', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
              >
                Go Back & Edit
              </button>
              <button 
                onClick={handleFinalSubmit} 
                style={{ flex: 1, padding: '18px', borderRadius: '12px', border: 'none', background: '#d97706', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}