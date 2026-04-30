import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";

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

export default function Quiz() {
  const [questions, setQuestions]   = useState([]);
  const [answers, setAnswers]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const hasFetched = useRef(false);
  const navigate   = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadQuestions();
  }, []);

  async function loadQuestions() {
    hasFetched.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await sendMessage("request.quiz.questions", {});
      if (result?.success && Array.isArray(result.questions) && result.questions.length > 0) {
        setQuestions(result.questions);
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
    setAnswers(prev => ({ ...prev, [String(questionId)]: String(optionId) }));
  };

  const answered    = questions.filter(q => answers[String(q.question_id)] !== undefined).length;
  const allAnswered = questions.length > 0 && answered === questions.length;
  const progress    = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;

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

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Compatibility Quiz</h1>
        <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>
          {loading ? "Loading questions…" : `Answer all ${questions.length} questions to find your ideal match.`}
        </p>
      </div>

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
              const isAnswered = answers[String(question.question_id)] !== undefined;
              return (
                <div
                  key={question.question_id}
                  style={{ background: "white", borderRadius: "20px", padding: "24px 28px", border: isAnswered ? "2px solid #d97706" : "1px solid #efdfd1", transition: "border 0.2s ease" }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "18px" }}>
                    <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: isAnswered ? "#d97706" : "#f3e8de", color: isAnswered ? "white" : "#a8a29e", fontSize: "13px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s ease" }}>
                      {isAnswered ? "✓" : index + 1}
                    </span>
                    <p style={{ margin: 0, fontWeight: "700", color: "#2f241d", fontSize: "16px", lineHeight: "1.5" }}>
                      {question.question_text}
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingLeft: "42px" }}>
                    {(question.options || []).map(option => {
                      const selected = answers[String(question.question_id)] === String(option.option_id);
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
                            {option.option_text}
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
              {submitting ? "Finding your matches…" : allAnswered ? "Find My Match →" : `Answer all questions to continue (${answered}/${questions.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
