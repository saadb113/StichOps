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
import { PencilIcon, GearIcon, ArrowLeftIcon, MailIcon } from '../icons/Icon';


function elgStatusClass(status) {
  if (status === 'Active' || status === 'Paid') return 'elg-badge-completed';
  if (status === 'Inactive' || status === 'Free Trial') return 'elg-badge-inprogress';
  return 'elg-badge-cancelled';
}

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const id = Number(employeeId);
  const { getEmployee, orders, customers } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();
  const [tab, setTab] = useState('earnings');

  const e = getEmployee(id);
  if (!e) return <div className="elg-page"><div className="elg-empty">Employee not found.</div></div>;

  const os = ordersForEmployee(orders, customers, e).filter((o) => o.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date));
  const initials = e.name.split(' ').map((w) => w[0]).join('').toUpperCase();
  const unpaidReady = os.filter((o) => (e.role === 'Salesperson' ? !o.commissionPaid : !o.productionPaid));

  return (
    <div className="elg-page">
      <div className="elg-back-link" onClick={() => navigate(isAdmin ? '/employees' : '/employees')}>
        <ArrowLeftIcon /> Back
      </div>

      <div className="elg-page-head" style={{ marginBottom: 20 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              className="elg-avatar-lg"
            >
              {initials}
            </div>
            <div>
              <div className="elg-profile-name">
                {e.name}
              </div>
              <div className="elg-page-sub" >
                {e.role} &middot; Paid in {e.currency}
                &middot; Payout on the {e.payoutDay}{nth(e.payoutDay)} of each month
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="elg-btn"
              style={{ width: 'auto' }}
              onClick={() => openModal(<EmployeeFormModal employee={e} />, { variant: 'elegant' })}
            >
              <img src="../icons/pencil-icon.svg" alt="Pencil Icon" />
              Edit Profile
            </button>
            <button
              className="elg-btn"
              style={{ width: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => openModal(<EmployeeSettingsMenuModal employeeId={e.id} />, { variant: 'elegant' })}
              title="Settings"
              aria-label="Settings"
            >
              <img src="../icons/dots-icon.svg" alt="Settings" />
            </button>
          </div>
        </div>
      </div>

      <div className="elg-profile-grid">
        <div>
          <div className="elg-tabs" style={{ marginBottom: 18 }}>
            <div
              className={`elg-tab ${tab === 'earnings' ? 'active' : ''}`}
              onClick={() => setTab('earnings')}
            >
              Earnings
            </div>
            <div
              className={`elg-tab ${tab === 'slip' ? 'active' : ''}`}
              onClick={() => setTab('slip')}
            >
              Salary Slip {unpaidReady.length ? ' · ready' : ''}
            </div>
            <div
              className={`elg-tab ${tab === 'history' ? 'active' : ''}`}
              onClick={() => setTab('history')}
            >
              Slip History
            </div>
          </div>


          {tab === 'earnings' && <EarningsTab employee={e} orders={os} />}
          {tab === 'slip' && <SlipDraftTab employee={e} unpaidReady={unpaidReady} onApproved={() => setTab('history')} />}
          {tab === 'history' && <SlipHistoryTab employee={e} />}
        </div>

        <div className="elg-profile-sidebar">
          <div className="elg-panel" style={{ marginBottom: 16 }}>
            <div className="elg-panel-head">
              <h3>Pay Details</h3>
            </div>
            <div className="elg-panel-body">
              <div className="elg-kv">
                <div className="elg-kv-row" >
                  <span className="k">Base Salary</span>
                  <strong className="v" >{fmt(e.baseSalary, e.currency)}</strong>
                </div>
                <div className="elg-kv-row" >
                  <span className="k" >Currency</span>
                  <span className="v">{e.currency}</span>
                </div>
                <div className="elg-kv-row" >
                  <span className="k" >Payout Day</span>
                  <span className="v" >{e.payoutDay}th of each month</span>
                </div>
                <div className="elg-kv-row" >
                  <span className="k" >{e.role === 'Salesperson' ? 'Commission' : 'Basis'}</span>
                  <span className="v">
                    {e.role === 'Salesperson' ? 'Per order rate' : 'Production cost basis'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {e.role === 'Salesperson' && (
            <div className="elg-panel" style={{ padding: 20 }}>
              <div className="elg-panel-head">
                <h3>Assigned Emails</h3>
              </div>
              <div className="elg-panel-body" >
                {e.emails && e.emails.length ? (
                  e.emails.map((em) => (
                    <div className="elg-kv-row" 
                      key={em}
                      style={{
                        fontSize: 12,
                        fontWeight: 500
                      }}
                    >
                      {em}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>
                    No assigned emails. You can add assigned emails by editing employee profile.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
