import { useEffect, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { PHONE_CODES, splitContact, CCY_NAMES } from '../../lib/constants';
import { EyeIcon, EyeOffIcon, PencilIcon } from '../icons/Icon';
import EditCurrencyModal from './EditCurrencyModal';

export default function CompanyDetailsTab() {
  const { company, currencyRates, updateCompany, changePassword } = useAppState();
  const { openModal, toast } = useUi();

  const [name, setName] = useState(company?.name || '');
  const [address, setAddress] = useState(company?.address || '');
  const [email, setEmail] = useState(company?.email || '');
  const initContact = splitContact(company?.contact);
  const [phoneCode, setPhoneCode] = useState(initContact.code);
  const [phone, setPhone] = useState(initContact.num);
  const [defaultCurrency, setDefaultCurrency] = useState(company?.defaultCurrency || 'PKR');

  useEffect(() => {
    if (!company) return;
    setName(company.name || '');
    setAddress(company.address || '');
    setEmail(company.email || '');
    const c = splitContact(company.contact);
    setPhoneCode(c.code);
    setPhone(c.num);
    setDefaultCurrency(company.defaultCurrency || 'PKR');
  }, [company]);

  async function saveDetails(patch) {
    try {
      await updateCompany(patch);
      toast('Company details updated.');
    } catch (e) {
      toast(e.message);
    }
  }

  function handleBlurName() { if (name.trim() !== company?.name) saveDetails({ name: name.trim() }); }
  function handleBlurAddress() { if (address.trim() !== company?.address) saveDetails({ address: address.trim() }); }
  function handleBlurEmail() { if (email.trim() !== company?.email) saveDetails({ email: email.trim() }); }
  function handleBlurContact() {
    const combined = phone.trim() ? `${phoneCode} ${phone.trim()}` : '';
    if (combined !== company?.contact) saveDetails({ contact: combined });
  }
  function handleDefaultCurrencyChange(val) {
    setDefaultCurrency(val);
    saveDetails({ defaultCurrency: val });
  }

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleChangePassword() {
    if (!currentPw) { toast('Enter your current password.'); return; }
    if (newPw.length < 6) { toast('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { toast('Passwords do not match.'); return; }
    const res = await changePassword(currentPw, newPw);
    if (!res.ok) { toast(res.error); return; }
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    toast('Password changed.');
  }

  if (!company) return null;

  return (
    <>
      <div className="elg-settings-card">
        <div className="elg-settings-card-title"><h2>Company Details</h2></div>
        <div className="elg-field-row">
          <div className="elg-field">
            <label>Company Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleBlurName} />
          </div>
          <div className="elg-field">
            <label>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} onBlur={handleBlurAddress} />
          </div>
        </div>
        <div className="elg-field-row">
          <div className="elg-field" style={{marginBottom : 0}}>
            <label>Company Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={handleBlurEmail} />
          </div>
          <div className="elg-field" style={{marginBottom : 0}}>
            <label>Contact Number</label>
            <div className='elg-price-field' style={{ display: 'flex', gap: 8 }}>
              <select className="elg-select"  value={phoneCode} onChange={(e) => { setPhoneCode(e.target.value); setTimeout(handleBlurContact, 0); }}>
                {PHONE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={handleBlurContact} placeholder="313 2799726" />
            </div>
          </div>
        </div>
      </div>

      <div className="elg-settings-card">
        <div className="elg-settings-card-title"><h2>Currencies</h2></div>
        <div className="elg-field" style={{ marginBottom: 20 }}>
          <label>Default Currency</label>
          <select className="elg-select" value={defaultCurrency} onChange={(e) => handleDefaultCurrencyChange(e.target.value)}>
            {Object.keys(CCY_NAMES).map((cc) => <option key={cc} value={cc}>{CCY_NAMES[cc]}</option>)}
          </select>
        </div>
        <div className="elg-table-wrap elg-edit-currency-modal" style={{ border: '1px solid var(--elg-line)', borderRadius: 8, padding: 10 }}>
          <table className="elg-table">
            <thead><tr><th>Currency</th><th>Current Rates in {defaultCurrency}</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {currencyRates.length === 0 && <tr><td colSpan={3} className="elg-empty">No currency rates yet.</td></tr>}
              {currencyRates.map((r) => (
                <tr key={r.currency}>
                  <td>{r.currency}</td>
                  <td>Rs. {r.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="elg-icon-sq" title="Edit" style={{marginLeft : "auto"}} onClick={() => openModal(<EditCurrencyModal rate={r} />, { variant: 'elegant' })}>
                      <img src='/images/edit.svg' width="14px" height="14px" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="elg-settings-card">
        <div className="elg-settings-card-title"><h2>Passwords</h2></div>
        <div className="elg-field">
          <label>Current Password</label>
          <div className="elg-password-field">
            <input type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
            <button type="button" className="elg-password-toggle" onClick={() => setShowCurrent((v) => !v)} tabIndex={-1}>
              {showCurrent ? <img src="/images/showpwd.svg" alt="" /> : <img src="/images/hidepwd.svg" alt="" />}
            </button>
          </div>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <a href="#" style={{ fontSize: 14, lineHeight : "21px", color: 'var(--elg-primary)', textDecoration: 'underline' }} onClick={(e) => e.preventDefault()}>Forgot password?</a>
          </div>
        </div>
        <div className="elg-field">
          <label>New Password</label>
          <div className="elg-password-field">
            <input type={showNew ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 6 characters" />
            <button type="button" className="elg-password-toggle" onClick={() => setShowNew((v) => !v)} tabIndex={-1}>
              {showNew ? <img src="/images/showpwd.svg" alt="" /> : <img src="/images/hidepwd.svg" alt="" />}
            </button>
          </div>
        </div>
        <div className="elg-field">
          <label>Confirm Password</label>
          <div className="elg-password-field">
            <input type={showConfirm ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="At least 6 characters" />
            <button type="button" className="elg-password-toggle" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
              {showConfirm ? <img src="/images/showpwd.svg" alt="" /> : <img src="/images/hidepwd.svg" alt="" />}
            </button>
          </div>
        </div>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleChangePassword}>Update Password</button>
      </div>
    </>
  );
}
