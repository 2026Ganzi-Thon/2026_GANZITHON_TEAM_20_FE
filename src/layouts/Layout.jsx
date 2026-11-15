import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav";

function Layout() {
  return (
    <div className="app-layout">
      <main className="app-content">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

export default Layout;