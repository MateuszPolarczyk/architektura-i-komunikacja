import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { extractError } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("demo@parkingspot.dev");
  const [password, setPassword] = useState("demo12345");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(extractError(err, "Nieprawidłowy email lub hasło."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div style={{ width: "100%", maxWidth: 410 }}>
        <div className="auth-brand">
          <b>ParkingSpot</b>
        </div>
        <div className="card auth-card">
          <h1 style={{ marginTop: 0 }}>Logowanie</h1>
          <p className="muted">Zaloguj się, aby rezerwować miejsca parkingowe.</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Hasło</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Logowanie…" : "Zaloguj się"}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 16 }}>
            Nie masz konta? <Link to="/register">Zarejestruj się</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
