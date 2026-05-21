import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ fontSize: 48, fontWeight: 600, color: 'var(--text-primary)' }}>404</p>
      <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>Page not found.</p>
      <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Go to Home</Link>
    </div>
  );
}
