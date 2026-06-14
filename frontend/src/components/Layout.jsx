import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GlobalSearch from "./GlobalSearch";
import { IconGrid, IconLogout, IconMenu, IconPin, IconTicket } from "./icons";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  }

  const initials = (user?.email || "?").slice(0, 2).toUpperCase();
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="logo">
          <b>ParkingSpot</b>
        </div>

        <div className="section">Przegląd</div>
        <nav>
          <NavLink to="/" end onClick={closeMenu}>
            <IconGrid /> Pulpit
          </NavLink>
          <NavLink to="/parkings" onClick={closeMenu}>
            <IconPin /> Parkingi
          </NavLink>
          <NavLink to="/reservations" onClick={closeMenu}>
            <IconTicket /> Moje rezerwacje
          </NavLink>
        </nav>

        <div className="spacer" />

        <div className="user-card">
          <div className="avatar">{initials}</div>
          <div className="meta">
            <div className="name">{user?.email}</div>
            <div className="role">● Użytkownik</div>
          </div>
          <button title="Wyloguj" onClick={handleLogout}>
            <IconLogout />
          </button>
        </div>
      </aside>

      {menuOpen && <div className="sidebar-backdrop" onClick={closeMenu} />}

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <IconMenu />
          </button>
          <GlobalSearch />
          <div className="spacer" />
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
