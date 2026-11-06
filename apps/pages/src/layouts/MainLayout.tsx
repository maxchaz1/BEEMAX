import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { PortalHUDToolbar } from "../components/PortalHUDToolbar";
export function MainLayout() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Header />
        <main id="main-content">
          <Outlet />
        </main>
        <footer className="footer">
          <span>
            Portal-OS1 <span className="muted">/ Governor workspace</span>
          </span>
          <span>Cloudflare edge infrastructure</span>
        </footer>
      </div>
      <PortalHUDToolbar />
    </div>
  );
}
