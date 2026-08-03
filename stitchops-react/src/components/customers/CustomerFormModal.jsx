import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CCY, SYM } from '../../lib/constants';

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
      <div className="modal-head"><h3>{c ? 'Edit customer' : 'Add customer'}</h3><button className="btn btn-ghost btn-sm" onClick={closeModal}>Close</button></div>
      <div className="modal-body">
        {isAdmin && (
          <div className="field">
            <label>Customer ID</label>
            <input value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} placeholder="CUST-1001" />
            <div className="hint">Auto-generated, but you can set your own — it must be unique and will appear on this customer's invoices.</div>
            {codeError && <div style={{ color: 'var(--red)', fontSize: '11.5px', marginTop: 4, fontWeight: 600 }}>This ID is already in use by another customer.</div>}
          </div>
        )}
        <div className="field-row">
          <div className="field"><label>Contact name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="James Whitfield" /></div>
          <div className="field"><label>Company name</label><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Northbridge Retail Ltd" /></div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Country</label>
            <select value={country} onChange={(e) => handleCountryChange(e.target.value)}>
              {countries.map((co) => <option key={co} value={co}>{co}</option>)}
            </select>
            <div className="hint">Sets the default currency automatically — you can still change it below.</div>
          </div>
          <div className="field">
            <label>Default currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc}</option>)}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field"><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></div>
          <div className="field">
            <label>Email client</label>
            <select value={emailClient} onChange={(e) => setEmailClient(e.target.value)}>
              <option>Gmail</option><option>Outlook</option><option>Other</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field"><label>Contact number</label><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+44 7700 900123" /></div>
          <div className="field">
            <label>Salesperson</label>
            <select value={salesperson} onChange={(e) => setSalesperson(e.target.value)} disabled={isSalesperson}>
              {salespeople.map((e) => <option key={e.id}>{e.name}</option>)}
            </select>
            {isSalesperson && <div className="hint">Assigned to you automatically.</div>}
          </div>
        </div>
        {showReceivedEmail && (
          <div className="field">
            <label>Received on email</label>
            <select value={receivedEmail} onChange={(e) => setReceivedEmail(e.target.value)}>
              <option value="">— Select which of your emails this client came in on —</option>
              {currentEmployee.emails.map((em) => <option key={em} value={em}>{em}</option>)}
            </select>
            <div className="hint">Lets admin see which of your assigned emails brought in this client.</div>
          </div>
        )}
        {isAdmin && (
          <div className="field">
            <label>Invoice generation day</label>
            <input type="number" min="1" max="28" value={invoiceDay} onChange={(e) => setInvoiceDay(e.target.value)} placeholder="e.g. 5" />
            <div className="hint">You'll get a reminder the day before, and the draft invoice appears in the Invoice tab on this date.</div>
          </div>
        )}
        <div className="field"><label>Notes</label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional — pricing notes, requirements..." /></div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>{c ? 'Save changes' : 'Add customer'}</button>
      </div>
    </>
  );
}
