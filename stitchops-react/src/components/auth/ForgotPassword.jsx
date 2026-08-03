import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

export default function ForgotPassword() {
  const { submitForgotPassword } = useAppState();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const res = await submitForgotPassword(email.trim().toLowerCase());
    if (!res.ok) { setError(res.error); return; }
    setError('');
    setSent(true);
  }

  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-brand">Stitch<span>Ops</span></div>
      <div className="auth-sub">Enter your account email — your admin will approve a new temporary password.</div>
      {error && <div className="auth-error">{error}</div>}
      {sent ? (
        <>
          <div className="auth-hint-box" style={{ marginTop: 0 }}>Request sent. Your admin will review it and issue a new temporary password — you'll use the same email to log in once it's approved.</div>
          <button className="btn" style={{ width: '100%', marginTop: 14 }} onClick={() => navigate('/login')}>Back to login</button>
        </>
      ) : (
        <>
          <div className="field">
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@stitchops.com"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>Send request</button>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="#" style={{ fontSize: '12.5px', color: 'var(--accent)', fontWeight: 600 }} onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Back to login</a>
          </div>
        </>
      )}
    </div></div>
  );
}
