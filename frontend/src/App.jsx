import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ParkingList from "./pages/ParkingList";
import ParkingDetail from "./pages/ParkingDetail";
import Reservations from "./pages/Reservations";

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="content">Ładowanie…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/parkings" element={<Protected><ParkingList /></Protected>} />
      <Route path="/parkings/:id" element={<Protected><ParkingDetail /></Protected>} />
      <Route path="/reservations" element={<Protected><Reservations /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
