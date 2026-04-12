import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";
import Sidebar from "../components/Sidebar";

export default function Quiz() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const hasFetched = useRef(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadQuestions();
  }, []);

  async function loadQuestions() {
    setLoading(true);
    setError("");
    try {
      const result = await sendMessage("request.quiz.questions", {});
      if (result?.success && Array.isArray(result.questions) && result.questions.length > 0) {
        setQuestions(result.questions);
      } else {
        setError("No quiz questions found. Please contact an administrator.");
      }
    } catch (err) {
      setError("Could not load quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleAnswer = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: Number(optionId) }));
  };

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question_id] !== undefined);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allAnswered) {
      addToast("Please answer all questions before submitting.", "error");
      return;
    }
    const userId = localStorage.getItem("userId");
    if (!userId) {
      addToast("You must be logged in to take the quiz.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const result = await sendMessage("request.quiz.submit", {
        user_id: userId,
        answers: Object.values(answers).map(Number),
      });
      if (result?.success) {
        localStorage.setItem("quizMatchedDogIds", JSON.stringify(result.matched_dog_ids || []));
        addToast("Quiz submitted! Here are your matches.", "success");
        navigate("/quiz-results");
      } else {
        addToast(result?.error || "Quiz submission failed.", "error");
      }
    } catch (err) {
      addToast("Network error. Could not submit quiz.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <header className="content-header"><h1>Compatibility Quiz</h1></header>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ background: "white", borderRadius: "15px", padding: "24px" }}>
                <div style={{ height: "20px", width: "60%", background: "#e0e0e0", borderRadius: "6px", marginBottom: "16px" }} />
                <div style={{ height: "16px", width: "40%", background: "#e0e0e0", borderRadius: "6px" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <div className="empty-state">
            <h2>{error}</h2>
            <button className="btn btn-primary" onClick={loadQuestions}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  const answered = Object.keys(answers).length;

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header className="content-header" style={{ marginBottom: "30px" }}>
          <h1>Compatibility Quiz</h1>
          <p className="dashboard-subtitle">Answer a few questions so we can find your ideal dog match.</p>
        </header>

        <div style={{ marginBottom: "24px", background: "white", borderRadius: "12px", padding: "16px 24px", border: "1px solid #efdfd1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#6f5848", fontSize: "15px" }}>
            {answered} of {questions.length} answered
          </span>
          <div style={{ height: "8px", flex: 1, margin: "0 20px", background: "#fcedda", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(answered / questions.length) * 100}%`, background: "#d97706", borderRadius: "99px", transition: "width 0.3s ease" }} />
          </div>
          <span style={{ color: "#d97706", fontWeight: "bold", fontSize: "15px" }}>{Math.round((answered / questions.length) * 100)}%</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {questions.map((question, index) => (
              <div key={question.question_id} style={{ background: "white", borderRadius: "16px", padding: "28px", border: answers[question.question_id] ? "2px solid #d97706" : "1px solid #efdfd1" }}>
                <p style={{ margin: "0 0 20px 0", fontWeight: "600", color: "#2f241d", fontSize: "16px" }}>
                  {index + 1}. {question.question_text}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {(question.options || []).map((option) => {
                    const selected = answers[question.question_id] === option.option_id;
                    return (
                      <label
                        key={option.option_id}
                        style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          padding: "14px 18px", borderRadius: "10px", cursor: "pointer",
                          border: selected ? "2px solid #b45309" : "1px solid #dcc8b7",
                          background: selected ? "#fff7ed" : "white",
                          color: "#2f241d", fontWeight: selected ? "600" : "400",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="radio"
                          name={`question_${question.question_id}`}
                          value={option.option_id}
                          checked={selected}
                          onChange={() => handleAnswer(question.question_id, option.option_id)}
                          style={{ accentColor: "#b45309" }}
                        />
                        {option.option_text}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "32px" }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "18px", fontSize: "16px", opacity: (!allAnswered || submitting) ? 0.6 : 1 }}
              disabled={submitting || !allAnswered}
            >
              {submitting ? "Finding your matches..." : `Find My Match ${allAnswered ? "✓" : `(${answered}/${questions.length})`}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}