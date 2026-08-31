import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CCY, SYM } from '../../lib/constants';
import { CloseIcon, UserPlusIcon } from '../icons/Icon';

export default function CustomerFormModal({ customer = null }) {
  const { customers, employees, isAdmin, isSalesperson, currentEmployee, nextCustomerCode, addCustomer, updateCustomer } = useAppState();
  const { closeModal, toast } = useUi();

  const countries = Object.keys(CCY);
  const c = customer;

  const [customerCode, setCustomerCode] = useState(c ? (c.customerCode || '') : ('CUST-' + nextCustomerCode));
  const [codeError, setCodeError] = useState(false);
  const [name, setName] = useState(c ? c.name : '');
  const [company, setCompany] = useState(c ? c.company : '');
  const [country, setCountry] = useState(c ? c.country : countries[0]);
  const [currency, setCurrency] = useState(c ? c.currency : CCY[countries[0]]);
  const [address, setAddress] = useState(c ? (c.address || '') : '');
  const [zip, setZip] = useState(c ? (c.zip || '') : '');
  const [email, setEmail] = useState(c ? c.email : '');
  const [emailClient, setEmailClient] = useState(c ? c.emailClient : 'Gmail');
  const [contact, setContact] = useState(c ? c.contact : '');
  const salespeople = isSalesperson
    ? (currentEmployee ? [currentEmployee] : [])
    : employees.filter((e) => e.role === 'Salesperson');
  const defaultSalesperson = c ? c.salesperson : (isSalesperson && currentEmployee ? currentEmployee.name : (salespeople[0]?.name || ''));
  const [salesperson, setSalesperson] = useState(defaultSalesperson);
  const [receivedEmail, setReceivedEmail] = useState(c ? (c.receivedEmail || '') : '');
  const [invoiceDay, setInvoiceDay] = useState(c ? (c.invoiceDay || '') : 5);
  const [notes, setNotes] = useState(c ? c.notes : '');

  function handleCountryChange(val) {
    setCountry(val);
    setCurrency(CCY[val]);
  }

  async function handleSave() {
    const trimmedName = name.trim();
    const trimmedCompany = company.trim();
    if (!trimmedName || !trimmedCompany) { toast('Contact name and company are required.'); return; }

    let finalCode = null;
    if (isAdmin) {
      finalCode = customerCode.trim();
      setCodeError(false);
      if (!finalCode) { toast('Customer ID is required.'); return; }
      const clash = customers.find((x) => x.customerCode && x.customerCode.toLowerCase() === finalCode.toLowerCase() && x.id !== (c ? c.id : null));
      if (clash) { setCodeError(true); toast('That Customer ID is already in use — pick a different one.'); return; }
    } else if (c) {
      finalCode = c.customerCode || null;
    }

    const invoiceDayVal = isAdmin ? (Number(invoiceDay) || null) : (c ? (c.invoiceDay || null) : null);

    const data = {
      customerCode: finalCode,
      name: trimmedName, company: trimmedCompany,
      country, currency,
      address: address.trim(), zip: zip.trim(),
      email: email.trim(), emailClient,
      contact: contact.trim(),
      salesperson,
      receivedEmail: receivedEmail || null,
      invoiceDay: invoiceDayVal,
      notes: notes.trim()
    };

    try {
      if (c) {
        await updateCustomer(c.id, data);
        toast('Profile updated.');
      } else {
        await addCustomer(data);
        toast('Customer added.');
      }
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  const showReceivedEmail = isSalesperson && currentEmployee && currentEmployee.emails && currentEmployee.emails.length > 0;

  return (
    <>
      <button className="elg-modal-close" onClick={closeModal}><img src="/icons/model-close-icon.svg" alt="Close" width="20" height="20" /></button>

      {c ? (
        <div className="elg-modal-head-plain"><h3>Edit Profile</h3></div>
      ) : (
        <div className="elg-modal-hero">
          <div className="elg-modal-hero-icon"><img src="/images/addCustomer.svg" alt="" /></div>
          <div className="elg-modal-title">Add Customer</div>
          <div className="elg-modal-sub">Add your customer details to add customer profile.</div>
        </div>
      )}

      <div className="elg-modal-body addCustomer">
        {isAdmin && (
          <div className="elg-field">
            <label>Customer ID</label>
            <input className={codeError ? 'elg-input-danger' : ''} value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} placeholder="CUST-1001" />
            {codeError && <div style={{ color: 'var(--elg-red-ink)', fontSize: 11.5, marginTop: 5, fontWeight: 600 }}>This ID is already in use by another customer.</div>}
          </div>
        )}
        <div className="elg-field-row">
          <div className="elg-field"><label>Contact Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Carla Montero" /></div>
          <div className="elg-field"><label>Company Name</label><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Abc digitizing" /></div>
        </div>
       
        <div className="elg-field-row">
          <div className="elg-field">
            <label>Country</label>
            <select value={country} onChange={(e) => handleCountryChange(e.target.value)}>
              {countries.map((co) => <option key={co} value={co}>{co}</option>)}
            </select>
          </div>
          <div className="elg-field">
            <label>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc}</option>)}
            </select>
          </div>
        </div>
         <div className="elg-field-row">
          <div className="elg-field">
            <label>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 14 Riverside Yard, Manchester" />
          </div>
          <div className="elg-field">
            <label>Zip Code</label>
            <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="e.g. M1 4AB" />
          </div>
        </div>
        <div className="elg-field-row">
          <div className="elg-field"><label>Customer Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. carla@abcdigitizing.com" /></div>
          <div className="elg-field">
            <label>Email Client</label>
            <select value={emailClient} onChange={(e) => setEmailClient(e.target.value)}>
              <option>Gmail</option><option>Outlook</option><option>Other</option>
            </select>
          </div>
        </div>
        <div className="elg-field-row gr1">
          <div className="elg-field"><label>Contact Number</label><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. +44 7700 900123" /></div>
          
        </div>
        <div className="elg-field-row">
          
          <div className="elg-field">
            <label>Salesperson</label>
            <select value={salesperson} onChange={(e) => setSalesperson(e.target.value)} disabled={isSalesperson}>
              {salespeople.map((e) => <option key={e.id}>{e.name}</option>)}
            </select>
          </div>
          {isAdmin && (
            <>
            <div className="elg-field"><label>Invoice Generation Day</label><input type="number" min="1" max="28" value={invoiceDay} onChange={(e) => setInvoiceDay(e.target.value)} placeholder="e.g. 5" /></div>
            <div />
            </>
          )}
        </div>
        {showReceivedEmail && (
          <div className="elg-field">
            <label>Client on Email</label>
            <select value={receivedEmail} onChange={(e) => setReceivedEmail(e.target.value)}>
              <option value="">Select which of your emails this client came in on</option>
              {currentEmployee.emails.map((em) => <option key={em} value={em}>{em}</option>)}
            </select>
          </div>
        )}
          
        <div className="elg-field"><label>Notes (Optional)</label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pricing notes, requirements..." /></div>
      </div>
      <div className={`elg-modal-foot right-btns-fixed ${c ? 'plain' : ''}`}>
        <span className="spacer" />
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleSave}>{c ? 'Save Changes' : 'Add Customer'}</button>
      </div>
    </>
  );
}
