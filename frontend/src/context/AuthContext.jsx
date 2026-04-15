import { createContext, useContext, useMemo, useState, useEffect } from "react";

const AuthContext = createContext();

function parsePayload(token) {
  try {
    if (!token) return null;
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    // Add padding if needed
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const payload = parsePayload(token);
  if (!payload) {
    console.log("Token invalid: cannot parse payload");
    return false;
  }
  if (!payload.exp) {
    console.log("Token valid: no exp field");
    return true;
  }
  const expiryMs = payload.exp * 1000;
  const now = Date.now();
  console.log("Token exp:", payload.exp, "Expiry date:", new Date(expiryMs), "Now:", new Date(now));
  return expiryMs > now;
}

function parseRole(token) {
  const payload = parsePayload(token);
  return payload?.role || null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = sessionStorage.getItem("token");
    return isTokenValid(stored) ? stored : null;
  });

  useEffect(() => {
    if (token) {
      const payload = parsePayload(token);
      console.log("Token payload:", payload);
      if (payload && payload.exp) {
        console.log("Token expires at:", new Date(payload.exp * 1000), "Current time:", new Date());
      }
      if (!isTokenValid(token)) {
        console.log("Token expired, logging out");
        sessionStorage.removeItem("token");
        setToken(null);
      }
    }
  }, [token]);

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

const BASE_URL = "https://job-portal-latest-ccvz.onrender.com";