// Global toast notification system. Wrap the app in ToastProvider (done in main.jsx),
// then call useToast().addToast("message", "success"|"error") from any component.
import React, { createContext, useState, useContext } from "react";
import "../index.css";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  // Array of active toast objects: { id, message, type }
  const [toasts, setToasts] = useState([]);

  // Creates a new toast and schedules its automatic removal after 3 seconds.
  // type defaults to "success" which maps to the .toast-success CSS class in index.css.
  const addToast = (message, type = "success") => {
    const id = Date.now(); // Timestamp used as a unique key.
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  // Filters out the toast with the given id — used both by the auto-timeout and the X button.
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Fixed top-right container that renders all active toasts stacked vertically. */}
      <div className="toast-container">
        {toasts.map((toast) => (
          // The CSS class toast-success or toast-error controls background/text color (see index.css).
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Convenience hook — import and call useToast() in any component to access addToast.
export function useToast() {
  return useContext(ToastContext);
}