// Compatibility quiz — loads questions from the DB via DataCacheContext, optionally pre-fills
// answers from the user's saved Profile preferences, and submits answers to request.quiz.submit.
// On success the backend returns matched dog IDs which are cached in localStorage and the user
// is sent to QuizResults. If the user has already completed the quiz they see a "retake" screen.
import React, { useState, useEffect, useRef, useEffectEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useDataCache } from "../context/dataCache";
import { useToast } from "../context/toast";

// Friendlier display text for question strings returned by the database.
// Keys are lowercase versions of the original DB strings.
const QUESTION_LABELS = {
  "how active is your lifestyle?":          "What best describes your activity level?",
  "what size dog are you looking for?":     "What size of dog are you looking to adopt?",
  "do you have children at home?":          "Are there children in your household?",
  "do you live in an apartment or condo?":  "How would you describe your living situation?",
  "do you have other dogs at home?":        "Do you currently have other dogs at home?",
  "do you have cats at home?":              "Are there cats in your household?",
  "do you have a yard?":                    "Does your home have a yard or outdoor space?",
  "how much time can you dedicate to training?": "How much time are you willing to dedicate to training?",
  "do you have a preference for dog gender?":    "Do you have a gender preference for your dog?",
  "do you prefer a vaccinated dog?":             "Do you require your dog to be vaccinated and spayed/neutered?",
};

const OPTION_LABELS = {
  "very active — i run, hike, or exercise daily":       "Very active — I exercise, run, or hike regularly",
  "moderately active — daily walks and light play":     "Moderately active — daily walks and occasional outdoor activities",
  "low key — i prefer calm and relaxed days":           "Low activity — I prefer a calm, home-centered lifestyle",
  "small (under 25 lbs)":                              "Small — under 25 lbs",
  "medium (25-60 lbs)":                                "Medium — 25 to 60 lbs",
  "large (60-90 lbs)":                                 "Large — 60 to 90 lbs",
  "extra large (90+ lbs)":                             "Extra large — over 90 lbs",
  "yes, i have children at home":                      "Yes — there are children living in my home",
  "no children at home":                               "No — there are no children in my household",
  "yes, i live in an apartment or condo":              "Yes — I live in an apartment or condominium",
  "no, i have a house with space":                     "No — I have a house with adequate space for a dog",
  "yes, i already have a dog":                         "Yes — I currently have at least one other dog",
  "no, this would be my only dog":                     "No — this would be my only dog",
  "yes, i have cats":                                  "Yes — I have one or more cats at home",
  "no cats at home":                                   "No — I do not have any cats",
  "no, i don't have cats":                             "No — I do not have any cats",
  "yes, i have a yard":                                "Yes — my home has a yard or outdoor space",
  "no, i don't have a yard":                           "No — I do not have a yard",
  "i can dedicate a lot of time to training":          "I can commit significant time to training and behavior work",
  "i can dedicate some time to training":              "I can dedicate moderate time to basic training",
  "i prefer an already trained dog":                   "I prefer a dog that is already trained",
  "i prefer a male dog":                               "I prefer a male dog",
  "i prefer a female dog":                             "I prefer a female dog",
  "i have no gender preference":                       "I have no gender preference",
  "yes, i prefer a vaccinated dog":                    "Yes — I require the dog to be vaccinated and spayed/neutered",
  "no preference":                                     "No specific preference",
};

function displayQuestion(text) {
  return QUESTION_LABELS[text.toLowerCase()] ?? text;
}
function displayOption(text) {
  return OPTION_LABELS[text.toLowerCase()] ?? text;
}

// Converts the user's Profile preference selections into quiz answer rules using partial-text
// matching, so the quiz remains compatible even if the DB wording changes slightly.
function buildRules(prefs) {
  const rules = [];

  if (prefs.activityLevel === "High — runs, hikes, very active")
    rules.push({ q: "active is your lifestyle", opt: "very active" });
  else if (prefs.activityLevel === "Moderate — daily walks")
    rules.push({ q: "active is your lifestyle", opt: "moderately active" });
  else if (prefs.activityLevel === "Low — mostly indoors")
    rules.push({ q: "active is your lifestyle", opt: "low key" });

  if (prefs.homeType === "Apartment")
    rules.push({ q: "apartment or condo", opt: "yes" });
  else if (prefs.homeType)
    rules.push({ q: "apartment or condo", opt: "house with space" });

  if (prefs.homeType === "House with yard" || prefs.homeType === "Farm / Rural")
    rules.push({ q: "yard", opt: "yes" });
  else if (prefs.homeType)
    rules.push({ q: "yard", opt: "no" });

  if (prefs.household === "With young children")
    rules.push({ q: "children at home", opt: "yes" });
  else if (prefs.household)
    rules.push({ q: "children at home", opt: "no" });

  if (prefs.otherPets === "Other dogs" || prefs.otherPets === "Both cats and dogs")
    rules.push({ q: "other dogs at home", opt: "yes" });
  else if (prefs.otherPets)
    rules.push({ q: "other dogs at home", opt: "no" });

  if (prefs.otherPets === "Cats" || prefs.otherPets === "Both cats and dogs")
    rules.push({ q: "cats at home", opt: "yes" });
  else if (prefs.otherPets)
    rules.push({ q: "cats at home", opt: "no" });

  if (prefs.experience === "Experienced owner")
    rules.push({ q: "training", opt: "a lot of time" });
  else if (prefs.experience === "Some experience")
    rules.push({ q: "training", opt: "some time" });
  else if (prefs.experience === "First-time owner")
    rules.push({ q: "training", opt: "already trained" });

  if (prefs.allergies === "Yes — hypoallergenic only" || prefs.allergies === "Mild — prefer low-shedding")
    rules.push({ q: "shedding", opt: "low-shed" });
  else if (prefs.allergies === "No allergies")
    rules.push({ q: "shedding", opt: "no preference" });

  return rules;
}

function buildPreFill(questions, prefs) {
  const rules = buildRules(prefs);
  const prefilled = {};
  for (const question of questions) {
    const qText = question.question_text.toLowerCase();
    for (const rule of rules) {
      if (qText.includes(rule.q.toLowerCase())) {
        const match = (question.options || []).find(opt =>
          opt.option_text.toLowerCase().includes(rule.opt.toLowerCase())
        );
        if (match) prefilled[String(question.question_id)] = String(match.option_id);
        break;
      }
    }
  }
  return prefilled;
}

// Placeholder shimmer card shown while questions are loading.
function QuestionSkeleton() {
  return (
    <div style={{ background: "white", borderRadius: "20px", border: "1px solid #efdfd1", padding: "28px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ height: "16px", width: "70%", borderRadius: "8px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
        {[80, 65, 75, 55].map((w, i) => (
          <div key={i} style={{ height: "46px", width: "100%", borderRadius: "10px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Quiz() {
  const [questions, setQuestions]         = useState([]);
  const [answers, setAnswers]             = useState({});
  const [prefilledKeys, setPrefilledKeys] = useState(new Set());
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");
  const [alreadyCompleted, setAlreadyCompleted] = useState(
    () => localStorage.getItem("quizCompleted") === "true"
  );

  // Stores the original profile-derived answers so we can restore the "from profile" badge
  // if the user picks a different option and then switches back.
  const originalPrefilled = useRef({});

  const hasFetched = useRef(false);
  const { getQuizQuestions } = useDataCache();
  const navigate   = useNavigate();
  const { addToast } = useToast();

  const profilePrefs = JSON.parse(localStorage.getItem("userProfile") || "{}").prefs || {};
  const hasProfile   = Object.keys(profilePrefs).length > 0;

  // Effect event: always calls the latest version without re-running the effect.
  const onMountLoad = useEffectEvent(() => loadQuestions());
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    onMountLoad();
  }, []);

  async function loadQuestions() {
    hasFetched.current = true;
    setLoading(true);
    setError("");
    try {
      const qs = await getQuizQuestions();
      if (Array.isArray(qs) && qs.length > 0) {
        setQuestions(qs);
        if (hasProfile) {
          const prefilled = buildPreFill(qs, profilePrefs);
          originalPrefilled.current = prefilled;
          setAnswers(prefilled);
          setPrefilledKeys(new Set(Object.keys(prefilled)));
        }
      } else {
        setError("No quiz questions found. Please contact an administrator.");
      }
    } catch {
      setError("Could not load quiz. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleAnswer = (questionId, optionId) => {
    const key     = String(questionId);
    const optStr  = String(optionId);
    setAnswers(prev => ({ ...prev, [key]: optStr }));

    // Restore "from profile" badge if user goes back to the original pre-filled option;
    // remove it only if they picked something different.
    setPrefilledKeys(prev => {
      const s = new Set(prev);
      if (optStr === originalPrefilled.current[key]) {
        s.add(key);
      } else {
        s.delete(key);
      }
      return s;
    });
  };

  const answered       = questions.filter(q => answers[String(q.question_id)] !== undefined).length;
  const allAnswered    = questions.length > 0 && answered === questions.length;
  const progress       = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;
  const prefilledCount = prefilledKeys.size;

  const handleSubmit = async () => {
    if (!allAnswered) { addToast("Please answer all questions before submitting.", "error"); return; }
    const userId = localStorage.getItem("userId");
    if (!userId)  { addToast("You must be logged in to take the quiz.", "error"); return; }
    setSubmitting(true);
    try {
      const result = await sendMessage("request.quiz.submit", {
        user_id: userId,
        answers: Object.values(answers).map(Number),
      });
      if (result?.success) {
        localStorage.setItem("quizMatchedDogIds", JSON.stringify(result.matched_dog_ids || []));
        localStorage.setItem("quizAnswers", JSON.stringify(answers));
        localStorage.setItem("quizCompleted", "true");
        addToast("Quiz submitted! Here are your matches.", "success");
        navigate("/quiz-results");
      } else {
        addToast(result?.error || "Quiz submission failed.", "error");
      }
    } catch {
      addToast("Network error. Could not submit quiz.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    localStorage.removeItem("quizCompleted");
    localStorage.removeItem("quizAnswers");
    localStorage.removeItem("quizMatchedDogIds");
    hasFetched.current = false;
    setAlreadyCompleted(false);
    loadQuestions();
  };

  if (alreadyCompleted) {
    return (
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 0 60px 0" }}>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Compatibility Quiz</h1>
        </div>
        <div style={{ background: "white", borderRadius: "24px", border: "1px solid #efdfd1", padding: "56px 40px", textAlign: "center" }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>🐾</div>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "22px", fontWeight: "800", color: "#2f241d" }}>
            You've already taken the quiz!
          </h2>
          <p style={{ margin: "0 0 36px 0", color: "#78716c", fontSize: "15px", lineHeight: "1.6" }}>
            Your matches are saved. Would you like to view them, or start fresh with a new quiz?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "320px", margin: "0 auto" }}>
            <button
              onClick={() => navigate("/quiz-results")}
              style={{ padding: "15px 28px", borderRadius: "14px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 16px rgba(217,119,6,0.3)" }}
            >
              View My Matches →
            </button>
            <button
              onClick={handleRetake}
              style={{ padding: "14px 28px", borderRadius: "14px", border: "2px solid #e2d9d0", background: "white", color: "#78716c", fontWeight: "600", fontSize: "15px", cursor: "pointer" }}
            >
              Take It Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Compatibility Quiz</h1>
        <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>
          {loading ? "Loading questions…" : `Answer all ${questions.length} questions to find your ideal match.`}
        </p>
      </div>

      {/* Profile pre-fill banner */}
      {!loading && !error && hasProfile && prefilledCount > 0 && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "16px", padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "20px", flexShrink: 0 }}>👤</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#92400e" }}>
              {prefilledCount} answer{prefilledCount !== 1 ? "s" : ""} pre-filled from your profile.
            </span>
            <span style={{ fontSize: "13px", color: "#b45309", marginLeft: "6px" }}>
              Review them below and adjust anything that doesn't fit.
            </span>
          </div>
          <Link to="/profile" style={{ fontSize: "12px", color: "#d97706", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
            Edit Profile →
          </Link>
        </div>
      )}

      {/* No profile nudge */}
      {!loading && !error && !hasProfile && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px", flexShrink: 0 }}>💡</span>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            <Link to="/profile" style={{ color: "#d97706", fontWeight: "700", textDecoration: "none" }}>Complete your profile</Link>
            {" "}to have relevant answers pre-filled automatically next time.
          </span>
        </div>
      )}

      {/* Progress bar */}
      {!loading && !error && questions.length > 0 && (
        <div style={{ background: "white", borderRadius: "16px", padding: "16px 24px", border: "1px solid #efdfd1", marginBottom: "28px", display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#78716c", whiteSpace: "nowrap" }}>
            {answered} / {questions.length}
          </span>
          <div style={{ flex: 1, height: "8px", background: "#f3e8de", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: allAnswered ? "#16a34a" : "#d97706", borderRadius: "99px", transition: "width 0.3s ease, background 0.3s ease" }} />
          </div>
          <span style={{ fontSize: "13px", fontWeight: "700", color: allAnswered ? "#16a34a" : "#d97706", whiteSpace: "nowrap" }}>
            {allAnswered ? "✓ Complete" : `${progress}%`}
          </span>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {Array.from({ length: 5 }).map((_, i) => <QuestionSkeleton key={i} />)}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "20px", border: "1px solid #efdfd1" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🧩</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "700", color: "#2f241d" }}>Quiz unavailable</h2>
          <p style={{ margin: "0 0 28px 0", color: "#78716c", fontSize: "15px" }}>{error}</p>
          <button
            onClick={() => { hasFetched.current = false; loadQuestions(); }}
            style={{ padding: "12px 28px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Questions */}
      {!loading && !error && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {questions.map((question, index) => {
              const qKey        = String(question.question_id);
              const isAnswered  = answers[qKey] !== undefined;
              const fromProfile = prefilledKeys.has(qKey);
              return (
                <div
                  key={question.question_id}
                  style={{
                    background: "white", borderRadius: "20px", padding: "24px 28px",
                    border: isAnswered ? "2px solid #d97706" : "1px solid #efdfd1",
                    transition: "border 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "18px" }}>
                    <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: isAnswered ? "#d97706" : "#f3e8de", color: isAnswered ? "white" : "#a8a29e", fontSize: "13px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s ease" }}>
                      {isAnswered ? "✓" : index + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: "700", color: "#2f241d", fontSize: "16px", lineHeight: "1.5" }}>
                        {displayQuestion(question.question_text)}
                      </p>
                      {fromProfile && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "6px", fontSize: "11px", fontWeight: "700", color: "#b45309", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "20px", padding: "2px 10px" }}>
                          👤 Pre-filled from your profile
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingLeft: "42px" }}>
                    {(question.options || []).map(option => {
                      const selected = answers[qKey] === String(option.option_id);
                      return (
                        <div
                          key={option.option_id}
                          onClick={() => handleAnswer(question.question_id, option.option_id)}
                          style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 18px", borderRadius: "12px", cursor: "pointer", border: selected ? "2px solid #d97706" : "1px solid #e2d9d0", background: selected ? "#fff7ed" : "white", transition: "all 0.15s ease" }}
                          onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#fffaf5"; }}
                          onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "white"; }}
                        >
                          <div style={{ width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, border: selected ? "5px solid #d97706" : "2px solid #d0c4b8", background: "white", transition: "all 0.15s ease" }} />
                          <span style={{ fontSize: "14px", fontWeight: selected ? "600" : "400", color: selected ? "#92400e" : "#2f241d", lineHeight: "1.4" }}>
                            {displayOption(option.option_text)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit */}
          <div style={{ marginTop: "28px" }}>
            {!allAnswered && (
              <p style={{ textAlign: "center", fontSize: "13px", color: "#a8a29e", marginBottom: "12px" }}>
                {questions.length - answered} question{questions.length - answered !== 1 ? "s" : ""} remaining
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              style={{ width: "100%", padding: "16px", borderRadius: "14px", border: "none", background: allAnswered ? "#d97706" : "#e2d9d0", color: allAnswered ? "white" : "#a8a29e", fontWeight: "700", fontSize: "16px", cursor: allAnswered ? "pointer" : "default", transition: "all 0.2s ease", boxShadow: allAnswered ? "0 4px 16px rgba(217,119,6,0.3)" : "none" }}
            >
              {submitting ? "Finding your matches…" : allAnswered ? "Find My Matches →" : `Answer all questions to continue (${answered}/${questions.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
