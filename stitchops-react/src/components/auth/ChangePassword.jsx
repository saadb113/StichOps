import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

export default function ChangePassword() {
  const { currentEmployee, submitNewPassword } = useAppState();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (pw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (pw !== confirm) { setError('Passwords do not match.'); return; }
    try {
      await submitNewPassword(pw);
    } catch (e) {
      setError(e.message);
      return;
    }
    setError('');
    navigate('/');
  }

  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-brand">Stitch<span>Ops</span></div>
      <div className="auth-sub">Welcome{currentEmployee ? ', ' + currentEmployee.name : ''} — set a new password to continue<span className="role-tag">First login</span></div>
      {error && <div className="auth-error">{error}</div>}
      <div className="field"><label>New password</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" /></div>
      <div className="field">
        <label>Confirm password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
      </div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} onClick={handleSubmit}>Set password &amp; continue</button>
    </div></div>
  );
}
