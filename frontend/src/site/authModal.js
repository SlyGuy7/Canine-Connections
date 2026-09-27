// Lets any public page open the login / sign-up dialog (rendered by PublicLayout).
import { createContext, useContext } from "react";

export const AuthModalContext = createContext({ openAuth: () => {} });

// openAuth("login" | "register" | "forgot-password")
export function useAuthModal() {
  return useContext(AuthModalContext);
}
