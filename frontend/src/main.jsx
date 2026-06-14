import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { AuthProvider } from "./auth/AuthContext";
import { OfflineProvider } from "./offline/OfflineContext";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
          <App />
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
