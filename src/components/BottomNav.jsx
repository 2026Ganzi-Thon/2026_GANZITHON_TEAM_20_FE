
import { NavLink } from "react-router-dom";
import { House, List, Settings } from "lucide-react";
import "./BottomNav.css";

function BottomNav() {
  const navItems = [
    {
      path: "/",
      label: "홈",
      icon: House,
      end: true,
    },
    {
      path: "/records",
      label: "기록",
      icon: List,
    },
    {
      path: "/settings",
      label: "설정",
      icon: Settings,
    },
  ];

  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? "active" : ""}`
            }
          >
            <Icon
              className="bottom-nav-icon"
              size={27}
              strokeWidth={1.7}
            />

            <span className="bottom-nav-label">
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default BottomNav;
