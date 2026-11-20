import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container section center">
      <h1 className="h2">Page not found</h1>
      <p className="lead mb-3">That page does not exist.</p>
      <Link to="/" className="btn">Back to home</Link>
    </div>
  );
}
