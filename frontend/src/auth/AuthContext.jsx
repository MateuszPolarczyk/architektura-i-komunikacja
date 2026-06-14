import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { tokenStore } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (tokenStore.access) {
        try {
          const { data } = await api.get("/auth/me/");
          setUser(data);
        } catch {
          tokenStore.clear();
        }
      }
      setLoading(false);
    }
    bootstrap();
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login/", { email, password });
    tokenStore.set({ access: data.access, refresh: data.refresh });
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    await api.post("/auth/register/", payload);
    return login(payload.email, payload.password);
  }

  async function logout() {
    try {
      if (tokenStore.refresh) {
        await api.post("/auth/logout/", { refresh: tokenStore.refresh });
      }
    } catch {

    }
    tokenStore.clear();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
