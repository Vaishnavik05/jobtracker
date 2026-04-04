import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext();

function parsePayload(token) {
  try {
    if (!token) return null;
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const payload = parsePayload(token);
  if (!payload) return false;
  if (!payload.exp) return true;
  return payload.exp * 1000 > Date.now();
}

function parseRole(token) {
  const payload = parsePayload(token);
  return payload?.role || null;
}

export function AuthProvider({ children }) {
  const initialToken = sessionStorage.getItem("token");
  const [token, setToken] = useState(isTokenValid(initialToken) ? initialToken : null);

  if (initialToken && !isTokenValid(initialToken)) {
    sessionStorage.removeItem("token");
  }

  const login = (newToken) => {
    if (!isTokenValid(newToken)) {
      sessionStorage.removeItem("token");
      setToken(null);
      return;
    }
    sessionStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    setToken(null);
  };

  const role = useMemo(() => parseRole(token), [token]);

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);