import { useAppState } from '../../store/AppStateContext';
import { fmt } from '../../lib/helpers';

export default function MyInfo() {
  const { currentEmployee: emp } = useAppState();

  return (
    <>
      <div className="topbar"><div><div className="page-title">My Info</div><div className="page-sub">Managed by your admin — contact them to correct anything</div></div></div>
      <div className="panel" style={{ maxWidth: 520 }}>
        <div className="panel-head"><h3>{emp.name}</h3></div>
        <div style={{ padding: '16px 18px' }}>
          <div className="kv">
            <div className="kv-row"><span className="k">Designation</span><span className="v">{emp.designation || '—'}</span></div>
            <div className="kv-row"><span className="k">Email</span><span className="v">{emp.email}</span></div>
            <div className="kv-row"><span className="k">Paid in</span><span className="v">{emp.currency}</span></div>
            <div className="kv-row"><span className="k">Base salary</span><span className="v">{fmt(emp.baseSalary, emp.currency)}</span></div>
            <div className="kv-row"><span className="k">Payout day</span><span className="v">{emp.payoutDay} of each month</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
