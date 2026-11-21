import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, LogOut, User, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  // NavLink matches the pathname only, so /browse, ?type=lost and ?type=found
  // would all be active together. Each browse link checks its own query.
  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  const browseClass = (type) => () => {
    if (pathname !== '/browse') return 'nav-link';
    const current = new URLSearchParams(search).get('type');
    if (type === null) return `nav-link${current ? '' : ' active'}`;
    return `nav-link${current === type ? ' active' : ''}`;
  };

  // /report?type=lost and /report?type=found share a pathname, so the active
  // state has to look at the query string as well.
  const reportClass = (type) => () =>
    `nav-link${pathname === '/report' && search.includes(`type=${type}`) ? ' active' : ''}`;

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark"><Search size={18} /></span>
          Campus Lost &amp; Found
        </Link>

        <nav id="primary-navigation" className={`nav-links${open ? ' open' : ''}`}>
          <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/browse" className={browseClass(null)} onClick={() => setOpen(false)}>Browse Items</NavLink>
          <NavLink to="/browse?type=lost" className={browseClass('lost')} onClick={() => setOpen(false)}>Lost</NavLink>
          <NavLink to="/browse?type=found" className={browseClass('found')} onClick={() => setOpen(false)}>Found</NavLink>
          {user && (
            <>
              <NavLink to="/report?type=lost" className={reportClass('lost')} onClick={() => setOpen(false)}>Report Lost</NavLink>
              <NavLink to="/report?type=found" className={reportClass('found')} onClick={() => setOpen(false)}>Report Found</NavLink>
              <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>Dashboard</NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>Admin</NavLink>
          )}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <Link to="/profile" className="nav-link" title="My profile">
                <User size={15} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                {(user.name || 'My profile').split(' ')[0]}
              </Link>
              <button className="btn btn-sm btn-outline-light" onClick={handleLogout}>
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-sm btn-accent">Register</Link>
            </>
          )}
          <button
            className="nav-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="primary-navigation"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
