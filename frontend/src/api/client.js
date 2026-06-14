import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export const tokenStore = {
  get access() {
    return localStorage.getItem("access");
  },
  get refresh() {
    return localStorage.getItem("refresh");
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
  },
  clear() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },
};

const api = axios.create({ baseURL: API_URL });

export function extractError(err, fallback = "Wystąpił błąd. Spróbuj ponownie.") {
  if (err?.message === "Network Error" || !err?.response) {
    return "Brak połączenia z serwerem (tryb offline).";
  }
  const data = err.response?.data;
  const body = data?.error?.detail ?? data;
  if (!body) return fallback;
  if (typeof body === "string") return body;
  if (body.detail) return body.detail;
  if (body.non_field_errors) return body.non_field_errors[0];
  if (typeof body === "object") {
    const [key, val] = Object.entries(body)[0] ?? [];
    if (key) return `${key}: ${Array.isArray(val) ? val[0] : val}`;
  }
  return fallback;
}

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isRefreshCall = original?.url?.includes("/auth/refresh/");
    if (status === 401 && !original._retry && !isRefreshCall && tokenStore.refresh) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_URL}/auth/refresh/`, { refresh: tokenStore.refresh });
        const { data } = await refreshing;
        refreshing = null;
        tokenStore.set({ access: data.access, refresh: data.refresh });
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        tokenStore.clear();
        window.location.href = "/login";
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
