// Toast context and hook, kept apart from ToastProvider so that file only exports a component
// (required for React fast refresh).
import { createContext, useContext } from "react";

export const ToastContext = createContext({ addToast: () => {} });

// Call useToast().addToast("message", "success"|"error") from any component.
export function useToast() {
  return useContext(ToastContext);
}
