import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <span className="brand-ball">⚽</span>
          <span>월드컵 예측</span>
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="nav-icon">☷</span>
            경기 목록
          </NavLink>
          <NavLink to="/my" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="nav-icon">♙</span>
            내 예측
          </NavLink>
          <NavLink to="/ranking" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="nav-icon">♛</span>
            순위
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active nav-link-admin' : 'nav-link nav-link-admin'}>
            <span className="nav-icon">⬡</span>
            관리자
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
