import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          ⚽ 월드컵 예측
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            경기 목록
          </NavLink>
          <NavLink to="/my" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            내 예측
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active nav-link-admin' : 'nav-link nav-link-admin'}>
            관리자
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
