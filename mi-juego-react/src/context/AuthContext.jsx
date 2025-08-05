
import React, { createContext, useState } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("authToken"));

  const login = async (username, password) => {
    try {
      const response = await fetch("/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok && data.isSuccess) {
        localStorage.setItem("authToken", data.token);
        setToken(data.token);
        return true;
      }
    } catch (err) {
      console.error("Login error:", err);
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
