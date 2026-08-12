import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, ordersForEmployee, nth } from '../../lib/helpers';
import EmployeeFormModal from './EmployeeFormModal';
import EmployeeSettingsMenuModal from './EmployeeSettingsMenuModal';
import AssignedEmailsModal from './AssignedEmailsModal';
import EarningsTab from './EarningsTab';
import SlipDraftTab from './SlipDraftTab';
import SlipHistoryTab from './SlipHistoryTab';
import { ArrowLeftIcon } from '../icons/Icon';

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const id = Number(employeeId);
  const { getEmployee, orders, customers } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();
  const [tab, setTab] = useState('earnings');
  const [showAllEmails, setShowAllEmails] = useState(false);

  const e = getEmployee(id);
  if (!e) return <div className="elg-page"><div className="elg-empty">Employee not found.</div></div>;

  const os = ordersForEmployee(orders, customers, e).filter((o) => o.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date));
  const initials = e.name.split(' ').map((w) => w[0]).join('').toUpperCase();
  const unpaidReady = os.filter((o) => (e.role === 'Salesperson' ? !o.commissionPaid : !o.productionPaid));
  const emailList = e.emails || [];
  const visibleEmails = showAllEmails ? emailList : emailList.slice(0, 3);

  return (
    <div className="elg-page">
      <div className="elg-back-link" onClick={() => navigate('/employees')}>
        <ArrowLeftIcon /> Back
      </div>

      <div className="elg-page-head">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="elg-avatar-lg">{initials}</div>
            <div>
              <div className="elg-profile-name">{e.name}</div>
              <div className="elg-page-sub">
                {e.role} &middot; Paid in {e.currency}
                &middot; Payout on the {e.payoutDay}{nth(e.payoutDay)} of each month
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="elg-btn"
              style={{ width: 'auto', background: 'transparent' }}
              onClick={() => openModal(<EmployeeFormModal employee={e} />, { variant: 'elegant' })}
            >
              <img src="/icons/pencil-icon.svg" alt="" />
              Edit Profile
            </button>
            <button
              className="elg-btn"
              style={{ width: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => openModal(<EmployeeSettingsMenuModal employeeId={e.id} />, { variant: 'elegant' })}
              title="Settings"
              aria-label="Settings"
            >
              <img src="/icons/dots-icon.svg" alt="" />
            </button>
          </div>
        </div>
      </div>

      <div className="elg-profile-grid">
        <div>
          <div className="elg-tabs" style={{ marginBottom: 18 }}>
            <div className={`elg-tab ${tab === 'earnings' ? 'active' : ''}`} onClick={() => setTab('earnings')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
<path d="M1.98993 6.8032C2.16966 6.58371 2.25953 6.47397 2.34685 6.50525C2.43416 6.53652 2.4339 6.68877 2.43338 6.99328C2.43337 6.99713 2.43337 7.00099 2.43337 7.00484C2.43337 10.6286 5.37103 13.5663 8.99483 13.5663C8.99869 13.5663 9.00254 13.5663 9.0064 13.5663C9.3109 13.5658 9.46316 13.5655 9.49443 13.6528C9.5257 13.7401 9.41596 13.83 9.19648 14.0097C8.31347 14.7328 7.18448 15.1667 5.95415 15.1667C3.12582 15.1667 0.833008 12.8739 0.833008 10.0455C0.833008 8.8152 1.26687 7.68621 1.98993 6.8032Z" fill={`${tab === 'earnings' ? 'white' : '#737373'}`}/>
<path d="M3.5 6.66634C3.5 3.44468 6.11167 0.833008 9.33333 0.833008C12.555 0.833008 15.1667 3.44468 15.1667 6.66634C15.1667 9.888 12.555 12.4997 9.33333 12.4997C6.11167 12.4997 3.5 9.888 3.5 6.66634Z" fill={`${tab === 'earnings' ? 'white' : '#737373'}`}/>
</svg> Earnings
            </div>
            <div className={`elg-tab ${tab === 'slip' ? 'active' : ''}`} onClick={() => setTab('slip')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
<path d="M5.33203 10.6663H7.9987M5.33203 7.33301L10.6654 7.33301" stroke={`${tab === 'slip' ? 'white' : '#737373'}`} stroke-width="1.2" stroke-linecap="round"/>
<path d="M5.00033 2.33301C3.96313 2.36412 3.34473 2.47957 2.91684 2.90786C2.33105 3.49419 2.33105 4.43788 2.33105 6.32525L2.33105 10.6626C2.33105 12.55 2.33105 13.4937 2.91684 14.08C3.50263 14.6663 4.44544 14.6663 6.33105 14.6663L9.66439 14.6663C11.55 14.6663 12.4928 14.6663 13.0786 14.08C13.6644 13.4937 13.6644 12.55 13.6644 10.6626V6.32525C13.6644 4.43788 13.6644 3.49419 13.0786 2.90786C12.6507 2.47957 12.0323 2.36412 10.9951 2.33301" stroke={`${tab === 'slip' ? 'white' : '#737373'}`} stroke-width="1.2"/>
<path d="M4.99805 2.49967C4.99805 1.85534 5.52038 1.33301 6.16471 1.33301L9.83138 1.33301C10.4757 1.33301 10.998 1.85534 10.998 2.49967C10.998 3.14401 10.4757 3.66634 9.83138 3.66634L6.16471 3.66634C5.52038 3.66634 4.99805 3.14401 4.99805 2.49967Z" stroke={`${tab === 'slip' ? 'white' : '#737373'}`} stroke-width="1.2" stroke-linejoin="round"/>
</svg>
              Salary Slip {unpaidReady.length ? ' · ready' : ''}
            </div>
            <div className={`elg-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
<path d="M12.6344 5.73739L14.3078 5.63551C13.1083 2.46952 9.66434 0.666284 6.30661 1.56284C2.73033 2.51775 0.606095 6.17372 1.56199 9.72869C2.51788 13.2837 6.19193 15.3914 9.76821 14.4365C12.4235 13.7275 14.2784 11.5294 14.6663 8.98926" stroke={`${tab === 'history' ? 'white' : '#737373'}`} stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 5.33301V7.99967L9.33333 9.33301" stroke={`${tab === 'history' ? 'white' : '#737373'}`} stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
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
              <h3>Employee Details</h3>
            </div>
            <div className="elg-panel-body">
              <div className="elg-kv">
                <div className="elg-kv-row"><span className="k">Name</span><span className="v">{e.name}</span></div>
                <div className="elg-kv-row"><span className="k">Team</span><span className="v">{e.role}</span></div>
                <div className="elg-kv-row"><span className="k">Designation</span><span className="v">{e.designation || '—'}</span></div>
                <div className="elg-kv-row"><span className="k">Email</span><span className="v">{e.email || '—'}</span></div>
                <div className="elg-kv-row"><span className="k">Contact</span><span className="v">{e.contact || '—'}</span></div>
              </div>
            </div>
          </div>

          <div className="elg-panel" style={{ marginBottom: 16 }}>
            <div className="elg-panel-head">
              <h3>Pay Details</h3>
            </div>
            <div className="elg-panel-body">
              <div className="elg-kv">
                <div className="elg-kv-row">
                  <span className="k">Base Salary</span>
                  <strong className="v">{fmt(e.baseSalary, e.currency)}</strong>
                </div>
                <div className="elg-kv-row">
                  <span className="k">Currency</span>
                  <span className="v">{e.currency}</span>
                </div>
                <div className="elg-kv-row">
                  <span className="k">Payout Day</span>
                  <span className="v">{e.payoutDay}th of each month</span>
                </div>
                <div className="elg-kv-row">
                  <span className="k">{e.role === 'Salesperson' ? 'Commission' : 'Basis'}</span>
                  <span className="v">
                    {e.role === 'Salesperson' ? 'Per order rate' : 'Production cost basis'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {e.role === 'Salesperson' && (
            <div className="elg-panel" style={{ padding: 20 }}>
              <div className="elg-panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>Assigned Emails</h3>
                <button
                  className="elg-btn elg-btn-ghost elg-btn-sm"
                  style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => openModal(<AssignedEmailsModal employee={e} />, { variant: 'elegant' })}
                  title="Edit assigned emails"
                >
                  <img src="/icons/pencil-icon.svg" alt="" width={13} height={13} />
                </button>
              </div>
              <div className="elg-panel-body">
                {emailList.length ? (
                  <>
                    {visibleEmails.map((em) => (
                      <div className="elg-kv-row" key={em} style={{ fontSize: 12, fontWeight: 500 }}>
                        {em}
                      </div>
                    ))}
                    {!showAllEmails && emailList.length > 3 && (
                      <a href="#" onClick={(ev) => { ev.preventDefault(); setShowAllEmails(true); }} style={{ fontSize: 12, lineHeight : "17px", color: '#334EAC', fontWeight: 400, margin : "auto", width : "100%", display : "flex", justifyContent : "center", textDecoration: 'underline', padding : "6.5px 10px" }}>
                        See more
                      </a>
                    )}
                  </>
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
