import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, ordersForEmployee, nth } from '../../lib/helpers';
import EmployeeFormModal from './EmployeeFormModal';
import ConfirmDeleteEmployeeModal from './ConfirmDeleteEmployeeModal';
import AssignedEmailsModal from './AssignedEmailsModal';
import CredentialsModal from './CredentialsModal';
import EarningsTab from './EarningsTab';
import SlipDraftTab from './SlipDraftTab';
import SlipHistoryTab from './SlipHistoryTab';
import EmployeeCustomersTab from './EmployeeCustomersTab';
import Avatar from '../common/Avatar';
import { ArrowLeftIcon, KeyIcon, TrashIcon, DocIcon, KebabIcon, PlusIcon } from '../icons/Icon';
import { ProfileSkeleton } from '../common/Skeleton';

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const id = Number(employeeId);
  const { dataLoading, getEmployee, orders, customers, company, regenerateCredentials, createLogin } = useAppState();
  const defaultCurrency = company?.defaultCurrency || 'PKR';
  const { openModal, toast } = useUi();
  const navigate = useNavigate();
  // A salesperson's profile opens straight to their customer book — that's
  // the thing admin is usually here to check — everyone else still opens to
  // Earnings/Slip as before.
  const [tab, setTab] = useState(getEmployee(id)?.role === 'Salesperson' ? 'customers' : 'earnings');
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState('content');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    function onDocClick(ev) { if (!ev.target.closest('.elg-row-actions')) setMenuOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const e = getEmployee(id);
  if (!e && dataLoading) {
    return (
      <ProfileSkeleton
        variant="employee"
        tabs={4}
        tabWidths={[119, 106, 166, 122]}
        panels={[
          { title: 'Employee Details', rows: ['Name', 'Team', 'Designation', 'Email', 'Contact'] },
          { title: 'Pay Details', rows: ['Base Salary', 'Currency', 'Payout Day', 'Commission'] },
          { title: 'Assigned Emails', rows: ['Email'] }
        ]}
      />
    );
  }
  if (!e) return <div className="elg-page"><div className="elg-empty">Employee not found.</div></div>;

  async function handleRegenerate() {
    setMenuOpen(false);
    let res;
    try {
      res = await regenerateCredentials(e.id);
    } catch (err) {
      toast(err.message);
      return;
    }
    if (!res) { toast('This employee has no login yet.'); return; }
    openModal(<CredentialsModal request={false} title="Login credentials regenerated" name={res.name} email={res.email} tempPw={res.tempPw} />, { variant: 'elegant', dismissible: false });
  }

  async function handleCreateLogin() {
    setMenuOpen(false);
    if (!e.email) { toast('Add an email to this profile first (Edit Profile), then create their login.'); return; }
    let res;
    try {
      res = await createLogin(e.id);
    } catch (err) {
      toast(err.message);
      return;
    }
    openModal(<CredentialsModal request={false} title="Login created" name={res.name} email={res.email} tempPw={res.tempPw} />, { variant: 'elegant', dismissible: false });
  }

  function handleDelete() {
    setMenuOpen(false);
    openModal(<ConfirmDeleteEmployeeModal employeeId={e.id} name={e.name} />, { variant: 'elegant' });
  }

  const os = ordersForEmployee(orders, customers, e).filter((o) => o.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date));
  const initials = e.name.split(' ').map((w) => w[0]).join('').toUpperCase();
  const unpaidReady = os.filter((o) => (e.role === 'Salesperson' ? !o.commissionPaid : !o.productionPaid));
  const emailList = e.emails || [];
  const visibleEmails = showAllEmails ? emailList : emailList.slice(0, 3);
  // Earnings only makes sense for the two default teams — a custom team
  // (e.g. Accountants) only ever gets a flat Salary Slip / Slip History.
  const hasEarningsTab = e.role === 'Salesperson' || e.role === 'Designer';
  // Only a salesperson owns customers.
  const hasCustomersTab = e.role === 'Salesperson';
  let effectiveTab = hasEarningsTab ? tab : (tab === 'earnings' ? 'slip' : tab);
  if (effectiveTab === 'customers' && !hasCustomersTab) effectiveTab = hasEarningsTab ? 'earnings' : 'slip';

  return (
    <div className="elg-page">
      <div className="elg-back-link" onClick={() => navigate('/employees')}>
        <ArrowLeftIcon /> Back
      </div>

      <div className="elg-mobile-profile-header">
        <button className="elg-mobile-back" onClick={() => navigate('/employees')}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.75 5.5C13.75 5.5 8.25001 9.55069 8.25 11C8.24999 12.4494 13.75 16.5 13.75 16.5" stroke="#191919" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <Avatar className="elg-mobile-avatar" src={e.photo} fallback={initials} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="elg-mobile-card-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
          <div className="elg-mobile-card-subtitle">{e.role}</div>
        </div>
        <button className={`elg-icon-sq elg-customer-toggle-btn edit-toggle-btn ${mobileView === 'details' ? 'active' : ''}`} title="Employee Details" onClick={() => setMobileView((v) => (v === 'details' ? 'content' : 'details'))}>

          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.91797 8.33333C2.91797 5.19064 2.91797 3.61929 3.9553 2.64298C4.99263 1.66667 6.66219 1.66667 10.0013 1.66667H10.6452C13.3629 1.66667 14.7217 1.66667 15.6654 2.33153C15.9358 2.52202 16.1758 2.74794 16.3782 3.00241C17.0846 3.89056 17.0846 5.16946 17.0846 7.72727V9.84848C17.0846 12.3178 17.0846 13.5524 16.6939 14.5385C16.0656 16.1238 14.737 17.3743 13.0527 17.9655C12.0049 18.3333 10.6931 18.3333 8.06948 18.3333C6.57026 18.3333 5.82065 18.3333 5.22195 18.1232C4.25946 17.7853 3.50026 17.0708 3.14127 16.1649C2.91797 15.6014 2.91797 14.8959 2.91797 13.4848V8.33333Z" stroke="#191919" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M17.0833 10C17.0833 11.5341 15.8397 12.7778 14.3056 12.7778C13.7507 12.7778 13.0966 12.6806 12.5572 12.8251C12.0779 12.9535 11.7035 13.3279 11.5751 13.8072C11.4306 14.3466 11.5278 15.0007 11.5278 15.5556C11.5278 17.0897 10.2841 18.3333 8.75 18.3333" stroke="#191919" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6.66797 5.83333H12.5013" stroke="#191919" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6.66797 9.16667H9.16797" stroke="#191919" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>

        </button>
        <div className="elg-row-actions">
          <button className="elg-icon-sq edit-toggle-btn" title="More" onClick={() => setMobileMenuOpen((v) => !v)}><img alt="More" src="/icons/filter-actions-dot-icon.svg" /></button>
          {mobileMenuOpen && (
            <div className="elg-row-menu">
              <button onClick={() => { setMobileMenuOpen(false); openModal(<EmployeeFormModal employee={e} />, { variant: 'elegant' }); }}>
                <img src="/icons/pencil-icon.svg" alt="" width={14} height={14} /> Edit Profile
              </button>
              {e.hasLogin ? (
                <button onClick={() => { setMobileMenuOpen(false); handleRegenerate(); }}>
                  <img src="/icons/reload-icon.svg" width={12} alt="" /> Regenerate Credentials
                </button>
              ) : (
                <button onClick={() => { setMobileMenuOpen(false); handleCreateLogin(); }}>
                  <img src="/icons/reload-icon.svg" width={12} alt="" /> Create Login
                </button>
              )}
              <button className="elg-btn-danger-text" onClick={() => { setMobileMenuOpen(false); handleDelete(); }}>
                <img src="/icons/delete-red-icon.svg" width={12} alt="" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="elg-page-head elg-employee-profile-head">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar className="elg-avatar-lg" src={e.photo} fallback={initials} />
            <div>
              <div className="elg-profile-name">{e.name}</div>
              <div className="elg-page-sub">
                {e.role} &middot; Paid in {defaultCurrency} &middot; Payout on the {e.payoutDay} {nth(e.payoutDay)} of each month
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
            <div className="elg-row-actions">
              <button
                className="elg-btn transparent"
                style={{ width: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setMenuOpen((v) => !v)}
                title="Settings"
                aria-label="Settings"
              >
                <img src="/icons/filter-actions-dot-icon.svg" alt="More" />
              </button>
              {menuOpen && (
                <div className="elg-row-menu">
                  {e.hasLogin ? (
                    <button onClick={handleRegenerate}>
                      <img src="/icons/reload-icon.svg" width={12} alt="Regenerate Icon" />
                      Regenerate Credentials
                    </button>
                  ) : (
                    <button onClick={handleCreateLogin}>
                      <img src="/icons/reload-icon.svg" width={12} alt="Create Login Icon" />
                      Create Login
                    </button>
                  )}
                  <button className="elg-btn-danger-text" onClick={handleDelete}>
                    <img src="/icons/delete-red-icon.svg" width={12} alt="Delete Icon" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`elg-profile-grid elg-mobile-view-${mobileView}`}>
        <div className="elg-mobile-tab-content-col">
          <div className="elg-tabs" style={{ marginBottom: 18 }}>
            {hasCustomersTab && (
              <div className={`elg-tab ${effectiveTab === 'customers' ? 'active' : ''}`} onClick={() => setTab('customers')}>
                {effectiveTab === 'customers' ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1.71342 8.86816C2.69828 8.20844 3.87344 8.0138 4.97026 8.28418C5.2284 8.34784 5.35784 8.38019 5.36967 8.4707C5.3811 8.56159 5.25485 8.62938 5.00248 8.76465C4.81109 8.86723 4.62373 8.97531 4.48588 9.06055C4.15611 9.25335 3.53509 9.61626 3.08647 10.0723C2.79692 10.3666 2.4161 10.8562 2.34526 11.5293C2.32344 11.737 2.33292 11.9361 2.36869 12.125C2.4045 12.3141 2.42241 12.4084 2.37455 12.458C2.32667 12.5075 2.2468 12.4959 2.08744 12.4717C1.40526 12.3677 0.944368 11.9954 0.56596 11.5898C0.282972 11.2865 0.136224 10.9375 0.172406 10.5645C0.206449 10.2141 0.394261 9.93186 0.581585 9.72559C0.877237 9.40007 1.31282 9.1242 1.57377 8.95898C1.62946 8.92373 1.67671 8.89275 1.71342 8.86816ZM4.00053 3.5C4.11093 3.50001 4.21977 3.50848 4.32573 3.52441C4.45194 3.5434 4.51495 3.55299 4.54741 3.60547C4.57982 3.65799 4.55751 3.72771 4.51225 3.86719C4.39647 4.22395 4.33354 4.60465 4.33354 5C4.33354 5.82663 4.60738 6.58985 5.06889 7.20312C5.15676 7.31989 5.20061 7.37835 5.18705 7.43848C5.17342 7.4985 5.11739 7.52876 5.00444 7.58789C4.70444 7.74495 4.36262 7.83299 4.00053 7.83301C2.80402 7.83301 1.83371 6.86346 1.83354 5.66699C1.83354 4.47038 2.80391 3.5 4.00053 3.5Z" fill="white" />
                  <path d="M11.031 8.28418C12.1278 8.01379 13.303 8.20843 14.2878 8.86816C14.3245 8.89275 14.3718 8.92373 14.4275 8.95898C14.6884 9.12419 15.124 9.40007 15.4197 9.72559C15.607 9.93186 15.7948 10.2141 15.8288 10.5645C15.865 10.9375 15.7183 11.2865 15.4353 11.5898C15.0569 11.9954 14.596 12.3678 13.9138 12.4717C13.7544 12.4959 13.6746 12.5075 13.6267 12.458C13.5788 12.4084 13.5967 12.3141 13.6325 12.125C13.6683 11.9361 13.6778 11.737 13.656 11.5293C13.5851 10.8562 13.2043 10.3666 12.9148 10.0723C12.4661 9.61626 11.8451 9.25334 11.5154 9.06055C11.3775 8.97531 11.1902 8.86723 10.9988 8.76465C10.7464 8.62938 10.6201 8.56159 10.6316 8.4707C10.6434 8.38019 10.7728 8.34784 11.031 8.28418ZM12.0007 3.5C13.1973 3.5 14.1677 4.47038 14.1677 5.66699C14.1675 6.86346 13.1972 7.83301 12.0007 7.83301C11.6386 7.833 11.2968 7.74496 10.9968 7.58789C10.8838 7.52875 10.8278 7.4985 10.8142 7.43848C10.8006 7.37834 10.8445 7.31991 10.9324 7.20312C11.3939 6.58985 11.6677 5.82663 11.6677 5C11.6677 4.60465 11.6048 4.22395 11.489 3.86719C11.4437 3.7277 11.4214 3.658 11.4538 3.60547C11.4863 3.55298 11.5493 3.5434 11.6755 3.52441C11.7815 3.50848 11.8903 3.5 12.0007 3.5Z" fill="white" />
                  <path d="M5.12764 9.64853C6.88616 8.56117 9.11664 8.56117 10.8752 9.64853C10.927 9.68059 10.9927 9.71901 11.0681 9.76316L11.0681 9.76317C11.4096 9.96301 11.9518 10.2802 12.3217 10.6563C12.5541 10.8924 12.7858 11.2144 12.828 11.6158C12.8732 12.0452 12.691 12.4427 12.3433 12.7867C11.7688 13.355 11.0573 13.833 10.1243 13.833H5.87849C4.94551 13.833 4.23396 13.355 3.65954 12.7867C3.31183 12.4427 3.12957 12.0452 3.17477 11.6158C3.21702 11.2144 3.44875 10.8924 3.6811 10.6563C4.05104 10.2802 4.59316 9.96301 4.93467 9.76317L4.93469 9.76316C5.01014 9.71901 5.0758 9.68059 5.12764 9.64853Z" fill="white" />
                  <path d="M5.16797 5.00033C5.16797 3.43552 6.4365 2.16699 8.0013 2.16699C9.56611 2.16699 10.8346 3.43552 10.8346 5.00033C10.8346 6.56513 9.56611 7.83366 8.0013 7.83366C6.4365 7.83366 5.16797 6.56513 5.16797 5.00033Z" fill="white" />
                </svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1.71342 8.86816C2.69828 8.20844 3.87344 8.0138 4.97026 8.28418C5.2284 8.34784 5.35784 8.38019 5.36967 8.4707C5.3811 8.56159 5.25485 8.62938 5.00248 8.76465C4.81109 8.86723 4.62373 8.97531 4.48588 9.06055C4.15611 9.25335 3.53509 9.61626 3.08647 10.0723C2.79692 10.3666 2.4161 10.8562 2.34526 11.5293C2.32344 11.737 2.33292 11.9361 2.36869 12.125C2.4045 12.3141 2.42241 12.4084 2.37455 12.458C2.32667 12.5075 2.2468 12.4959 2.08744 12.4717C1.40526 12.3677 0.944368 11.9954 0.56596 11.5898C0.282972 11.2865 0.136224 10.9375 0.172406 10.5645C0.206449 10.2141 0.394261 9.93186 0.581585 9.72559C0.877237 9.40007 1.31282 9.1242 1.57377 8.95898C1.62946 8.92373 1.67671 8.89275 1.71342 8.86816ZM4.00053 3.5C4.11093 3.50001 4.21977 3.50848 4.32573 3.52441C4.45194 3.5434 4.51495 3.55299 4.54741 3.60547C4.57982 3.65799 4.55751 3.72771 4.51225 3.86719C4.39647 4.22395 4.33354 4.60465 4.33354 5C4.33354 5.82663 4.60738 6.58985 5.06889 7.20312C5.15676 7.31989 5.20061 7.37835 5.18705 7.43848C5.17342 7.4985 5.11739 7.52876 5.00444 7.58789C4.70444 7.74495 4.36262 7.83299 4.00053 7.83301C2.80402 7.83301 1.83371 6.86346 1.83354 5.66699C1.83354 4.47038 2.80391 3.5 4.00053 3.5Z" fill="#737373" />
                  <path d="M11.031 8.28418C12.1278 8.01379 13.303 8.20843 14.2878 8.86816C14.3245 8.89275 14.3718 8.92373 14.4275 8.95898C14.6884 9.12419 15.124 9.40007 15.4197 9.72559C15.607 9.93186 15.7948 10.2141 15.8288 10.5645C15.865 10.9375 15.7183 11.2865 15.4353 11.5898C15.0569 11.9954 14.596 12.3678 13.9138 12.4717C13.7544 12.4959 13.6746 12.5075 13.6267 12.458C13.5788 12.4084 13.5967 12.3141 13.6325 12.125C13.6683 11.9361 13.6778 11.737 13.656 11.5293C13.5851 10.8562 13.2043 10.3666 12.9148 10.0723C12.4661 9.61626 11.8451 9.25334 11.5154 9.06055C11.3775 8.97531 11.1902 8.86723 10.9988 8.76465C10.7464 8.62938 10.6201 8.56159 10.6316 8.4707C10.6434 8.38019 10.7728 8.34784 11.031 8.28418ZM12.0007 3.5C13.1973 3.5 14.1677 4.47038 14.1677 5.66699C14.1675 6.86346 13.1972 7.83301 12.0007 7.83301C11.6386 7.833 11.2968 7.74496 10.9968 7.58789C10.8838 7.52875 10.8278 7.4985 10.8142 7.43848C10.8006 7.37834 10.8445 7.31991 10.9324 7.20312C11.3939 6.58985 11.6677 5.82663 11.6677 5C11.6677 4.60465 11.6048 4.22395 11.489 3.86719C11.4437 3.7277 11.4214 3.658 11.4538 3.60547C11.4863 3.55298 11.5493 3.5434 11.6755 3.52441C11.7815 3.50848 11.8903 3.5 12.0007 3.5Z" fill="#737373" />
                  <path d="M5.12764 9.64853C6.88616 8.56117 9.11664 8.56117 10.8752 9.64853C10.927 9.68059 10.9927 9.71901 11.0681 9.76316L11.0681 9.76317C11.4096 9.96301 11.9518 10.2802 12.3217 10.6563C12.5541 10.8924 12.7858 11.2144 12.828 11.6158C12.8732 12.0452 12.691 12.4427 12.3433 12.7867C11.7688 13.355 11.0573 13.833 10.1243 13.833H5.87849C4.94551 13.833 4.23396 13.355 3.65954 12.7867C3.31183 12.4427 3.12957 12.0452 3.17477 11.6158C3.21702 11.2144 3.44875 10.8924 3.6811 10.6563C4.05104 10.2802 4.59316 9.96301 4.93467 9.76317L4.93469 9.76316C5.01014 9.71901 5.0758 9.68059 5.12764 9.64853Z" fill="#737373" />
                  <path d="M5.16797 5.00033C5.16797 3.43552 6.4365 2.16699 8.0013 2.16699C9.56611 2.16699 10.8346 3.43552 10.8346 5.00033C10.8346 6.56513 9.56611 7.83366 8.0013 7.83366C6.4365 7.83366 5.16797 6.56513 5.16797 5.00033Z" fill="#737373" />
                </svg>}
                Customers
              </div>
            )}
            {hasEarningsTab && (
              <div className={`elg-tab ${effectiveTab === 'earnings' ? 'active' : ''}`} onClick={() => setTab('earnings')}>
                {effectiveTab === 'earnings' ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1.98993 6.8032C2.16966 6.58371 2.25953 6.47397 2.34685 6.50525C2.43416 6.53652 2.4339 6.68877 2.43338 6.99328C2.43337 6.99713 2.43337 7.00099 2.43337 7.00484C2.43337 10.6286 5.37103 13.5663 8.99483 13.5663C8.99869 13.5663 9.00254 13.5663 9.0064 13.5663C9.3109 13.5658 9.46316 13.5655 9.49443 13.6528C9.5257 13.7401 9.41596 13.83 9.19648 14.0097C8.31347 14.7328 7.18448 15.1667 5.95415 15.1667C3.12582 15.1667 0.833008 12.8739 0.833008 10.0455C0.833008 8.8152 1.26687 7.68621 1.98993 6.8032Z" fill="white" />
                  <path d="M3.5 6.66634C3.5 3.44468 6.11167 0.833008 9.33333 0.833008C12.555 0.833008 15.1667 3.44468 15.1667 6.66634C15.1667 9.888 12.555 12.4997 9.33333 12.4997C6.11167 12.4997 3.5 9.888 3.5 6.66634Z" fill="white" />
                </svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M9.33333 11.9997C12.2789 11.9997 14.6667 9.61186 14.6667 6.66634C14.6667 3.72082 12.2789 1.33301 9.33333 1.33301C6.38781 1.33301 4 3.72082 4 6.66634C4 9.61186 6.38781 11.9997 9.33333 11.9997Z" stroke="#737373" stroke-width="1.2" stroke-linecap="round" />
                  <path d="M8.77764 13.9789C8.04171 14.4156 7.18247 14.6663 6.26467 14.6663C3.54099 14.6663 1.33301 12.4583 1.33301 9.73464C1.33301 8.81685 1.58372 7.95761 2.02039 7.22168" stroke="#737373" stroke-width="1.2" stroke-linecap="round" />
                </svg>}
                Earnings
              </div>
            )}
            <div className={`elg-tab ${effectiveTab === 'slip' ? 'active' : ''}`} onClick={() => setTab('slip')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5.33203 10.6663H7.9987M5.33203 7.33301L10.6654 7.33301" stroke={`${effectiveTab === 'slip' ? 'white' : '#737373'}`} stroke-width="1.2" stroke-linecap="round" />
                <path d="M5.00033 2.33301C3.96313 2.36412 3.34473 2.47957 2.91684 2.90786C2.33105 3.49419 2.33105 4.43788 2.33105 6.32525L2.33105 10.6626C2.33105 12.55 2.33105 13.4937 2.91684 14.08C3.50263 14.6663 4.44544 14.6663 6.33105 14.6663L9.66439 14.6663C11.55 14.6663 12.4928 14.6663 13.0786 14.08C13.6644 13.4937 13.6644 12.55 13.6644 10.6626V6.32525C13.6644 4.43788 13.6644 3.49419 13.0786 2.90786C12.6507 2.47957 12.0323 2.36412 10.9951 2.33301" stroke={`${effectiveTab === 'slip' ? 'white' : '#737373'}`} stroke-width="1.2" />
                <path d="M4.99805 2.49967C4.99805 1.85534 5.52038 1.33301 6.16471 1.33301L9.83138 1.33301C10.4757 1.33301 10.998 1.85534 10.998 2.49967C10.998 3.14401 10.4757 3.66634 9.83138 3.66634L6.16471 3.66634C5.52038 3.66634 4.99805 3.14401 4.99805 2.49967Z" stroke={`${effectiveTab === 'slip' ? 'white' : '#737373'}`} stroke-width="1.2" stroke-linejoin="round" />
              </svg>
              Salary Slip {unpaidReady.length ? ' · Ready' : ''}
            </div>
            <div className={`elg-tab ${effectiveTab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12.6344 5.73739L14.3078 5.63551C13.1083 2.46952 9.66434 0.666284 6.30661 1.56284C2.73033 2.51775 0.606095 6.17372 1.56199 9.72869C2.51788 13.2837 6.19193 15.3914 9.76821 14.4365C12.4235 13.7275 14.2784 11.5294 14.6663 8.98926" stroke={`${effectiveTab === 'history' ? 'white' : '#737373'}`} stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M8 5.33301V7.99967L9.33333 9.33301" stroke={`${effectiveTab === 'history' ? 'white' : '#737373'}`} stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              Slip History
            </div>
          </div>

          {effectiveTab === 'customers' && <EmployeeCustomersTab employee={e} />}
          {effectiveTab === 'earnings' && <EarningsTab employee={e} orders={os} />}
          {effectiveTab === 'slip' && <SlipDraftTab employee={e} unpaidReady={unpaidReady} onApproved={() => setTab('history')} />}
          {effectiveTab === 'history' && <SlipHistoryTab employee={e} />}
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
                  <strong className="v">{fmt(e.baseSalary, defaultCurrency)}</strong>
                </div>
                <div className="elg-kv-row">
                  <span className="k">Currency</span>
                  <span className="v">{defaultCurrency}</span>
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
            <div className="elg-panel">
              <div className="elg-panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>Assigned Emails</h3>
                <button
                  className="elg-btn elg-btn-ghost elg-btn-sm"
                  style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => openModal(<AssignedEmailsModal employee={e} />, { variant: 'elegant' })}
                  title="Edit assigned emails"
                >
                  <img src="/icons/pencil-icon.svg" alt="" width={18} height={18} />
                </button>
              </div>
              <div className="elg-panel-body">
                {emailList.length ? (
                  <>
                    {visibleEmails.map((em) => (
                      <div className="elg-kv-row" key={em} style={{ color: "#191919", fontSize: 12, fontWeight: 500 }}>
                        {em}
                      </div>
                    ))}
                    {!showAllEmails && emailList.length > 3 && (
                      <a href="#" onClick={(ev) => { ev.preventDefault(); setShowAllEmails(true); }} style={{ fontSize: 12, lineHeight: "17px", color: '#334EAC', fontWeight: 400, margin: "auto", width: "100%", display: "flex", justifyContent: "center", textDecoration: 'underline', padding: "6.5px 10px" }}>
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
