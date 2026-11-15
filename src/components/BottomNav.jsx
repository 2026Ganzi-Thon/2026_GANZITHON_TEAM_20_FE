
import { NavLink } from "react-router-dom";

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/">홈</NavLink>
      <NavLink to="/records">기록</NavLink>
      <NavLink to="/settings">설정</NavLink>
    </nav>
  );
}

export default BottomNav;
