// Global toast notification system. Wrap the app in ToastProvider (done in main.jsx),
// then call useToast().addToast("message", "success"|"error") from any component.
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toast";
import "../index.css";

const TOAST_DURATION_MS = 3000;

export function ToastProvider({ children }) {
  // Array of active toast objects: { id, message, type }
  const [toasts, setToasts] = useState([]);
  // Incrementing id, so two toasts raised in the same millisecond never share a key.
  const nextId = useRef(0);

  // Filters out the toast with the given id — used both by the auto-timeout and the X button.
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Creates a new toast and schedules its automatic removal.
  // type defaults to "success" which maps to the .toast-success CSS class in index.css.
  const addToast = useCallback((message, type = "success") => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), TOAST_DURATION_MS);
  }, [removeToast]);

  // Stable value: components using useToast() don't re-render every time a toast appears.
  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Fixed top-right container that renders all active toasts stacked vertically. */}
      <div className="toast-container">
        {toasts.map((toast) => (
          // The CSS class toast-success or toast-error controls background/text color (see index.css).
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
