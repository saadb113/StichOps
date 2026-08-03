import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, ordersForEmployee, nth } from '../../lib/helpers';
import EmployeeFormModal from './EmployeeFormModal';
import EmployeeSettingsMenuModal from './EmployeeSettingsMenuModal';
import EarningsTab from './EarningsTab';
import SlipDraftTab from './SlipDraftTab';
import SlipHistoryTab from './SlipHistoryTab';

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const id = Number(employeeId);
  const { getEmployee, orders, customers } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();
  const [tab, setTab] = useState('earnings');

  const e = getEmployee(id);
  if (!e) return <div className="empty">Employee not found.</div>;

  const os = ordersForEmployee(orders, customers, e).filter((o) => o.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date));
  const initials = e.name.split(' ').map((w) => w[0]).join('').toUpperCase();
  const unpaidReady = os.filter((o) => (e.role === 'Salesperson' ? !o.commissionPaid : !o.productionPaid));

  return (
    <>
      <div className="topbar">
        <div className="page-sub" style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }} onClick={() => navigate('/employees')}>&larr; All employees</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => openModal(<EmployeeFormModal employee={e} />)}>Edit employee</button>
          <button className="btn btn-ghost" onClick={() => openModal(<EmployeeSettingsMenuModal employeeId={e.id} />)} title="Settings" aria-label="Settings">&#9881;</button>
        </div>
      </div>
      <div className="profile-head">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div className="avatar">{initials}</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{e.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{e.role} &middot; paid in {e.currency} &middot; payout on the {e.payoutDay}{nth(e.payoutDay)}</div>
          </div>
        </div>
      </div>
      <div className="profile-grid">
        <div>
          <div className="tabs">
            <div className={`tab ${tab === 'earnings' ? 'active' : ''}`} onClick={() => setTab('earnings')}>Earnings</div>
            <div className={`tab ${tab === 'slip' ? 'active' : ''}`} onClick={() => setTab('slip')}>Salary slip {unpaidReady.length ? '· ready' : ''}</div>
            <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Slip history</div>
          </div>
          {tab === 'earnings' && <EarningsTab employee={e} orders={os} />}
          {tab === 'slip' && <SlipDraftTab employee={e} unpaidReady={unpaidReady} onApproved={() => setTab('history')} />}
          {tab === 'history' && <SlipHistoryTab employee={e} />}
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Pay details</h3></div>
          <div style={{ padding: '16px 18px' }}>
            <div className="kv">
              <div className="kv-row"><span className="k">Base salary</span><span className="v">{fmt(e.baseSalary, e.currency)}</span></div>
              <div className="kv-row"><span className="k">Currency</span><span className="v">{e.currency}</span></div>
              <div className="kv-row"><span className="k">Payout day</span><span className="v">{e.payoutDay} of each month</span></div>
              <div className="kv-row"><span className="k">{e.role === 'Salesperson' ? 'Commission rate' : 'Basis'}</span><span className="v">{e.role === 'Salesperson' ? 'Per order, set on order' : 'Per order production cost'}</span></div>
            </div>
          </div>
        </div>
        {e.role === 'Salesperson' && (
          <div className="panel">
            <div className="panel-head"><h3>Assigned emails</h3></div>
            <div style={{ padding: '16px 18px' }}>
              {e.emails && e.emails.length ? e.emails.map((em) => <div key={em} style={{ fontSize: '12.5px', fontFamily: 'var(--mono)', padding: '5px 0', borderTop: '1px solid var(--line)' }}>{em}</div>) : <div className="hint" style={{ margin: 0 }}>No emails assigned yet — add some from Company Settings via Edit employee.</div>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
