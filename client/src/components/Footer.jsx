import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>Campus Lost &amp; Found</h4>
            <p className="small">
              A single, searchable record of lost and found belongings on campus. Report an item,
              find a match and recover it without relying on chat groups.
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <Link to="/browse">Browse items</Link>
            <Link to="/report">Report an item</Link>
            <Link to="/dashboard">Dashboard</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <Link to="/profile">Profile</Link>
          </div>
          <div>
            <h4>Information</h4>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <div>
            <h4>University</h4>
            <p className="small">Sai University</p>
            <p className="small">School of Computing and Data Science</p>
            <p className="small">B.Tech Computer Science, 2026-2027</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Campus Lost &amp; Found Management System</span>
          <span>Academic project - Web Technology and Internet Programming</span>
        </div>
      </div>
    </footer>
  );
}
