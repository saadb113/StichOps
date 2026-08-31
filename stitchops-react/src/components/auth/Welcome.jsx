import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { fmt } from '../../lib/helpers';

export default function Welcome() {
  const { currentEmployee, company, markWelcomed } = useAppState();
  const navigate = useNavigate();
  const defaultCurrency = company?.defaultCurrency || 'PKR';

  useEffect(() => {
    if (!currentEmployee) {
      markWelcomed().then(() => navigate('/', { replace: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployee]);

  if (!currentEmployee) return null;
  const e = currentEmployee;

  async function handleContinue() {
    await markWelcomed();
    navigate('/');
  }

  return (
    <div className="elg-auth-wrap">
      <div className="elg-auth-card" style={{ width: 460 }}>
        <div className="elg-auth-title">Your Details</div>
        <div className="elg-auth-sub">Here's what's on file for you — check it's correct before you continue.</div>
        <div className="elg-kv">
          <div className="elg-kv-row"><span className="k">Name</span><span className="v">{e.name}</span></div>
          <div className="elg-kv-row"><span className="k">Designation</span><span className="v">{e.designation || '—'}</span></div>
          <div className="elg-kv-row"><span className="k">Email</span><span className="v">{e.email}</span></div>
          <div className="elg-kv-row"><span className="k">Paid in</span><span className="v">{defaultCurrency}</span></div>
          <div className="elg-kv-row"><span className="k">Base salary</span><span className="v">{fmt(e.baseSalary, defaultCurrency)}</span></div>
          <div className="elg-kv-row"><span className="k">Payout day</span><span className="v">{e.payoutDay} of each month</span></div>
        </div>
        <button className="elg-btn elg-btn-primary" style={{ marginTop: 40 }} onClick={handleContinue}>Continue to My Dashboard</button>
        <div className="elg-auth-hint">Notice something wrong? Let your admin know — this is managed by them.</div>
      </div>
    </div>
  );
}
