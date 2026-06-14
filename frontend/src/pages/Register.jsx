import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { extractError } from "../api/client";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(key) {
    return (e) => setForm({ ...form, [key]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(extractError(err, "Rejestracja nie powiodła się."));
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
          <h1 style={{ marginTop: 0 }}>Rejestracja</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={update("email")} required />
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1 }}>
                <label>Imię</label>
                <input value={form.first_name} onChange={update("first_name")} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Nazwisko</label>
                <input value={form.last_name} onChange={update("last_name")} />
              </div>
            </div>
            <div className="field">
              <label>Hasło</label>
              <input type="password" value={form.password} onChange={update("password")} required />
            </div>
            <div className="field">
              <label>Powtórz hasło</label>
              <input type="password" value={form.password2} onChange={update("password2")} required />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Tworzenie konta…" : "Utwórz konto"}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 16 }}>
            Masz już konto? <Link to="/login">Zaloguj się</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
