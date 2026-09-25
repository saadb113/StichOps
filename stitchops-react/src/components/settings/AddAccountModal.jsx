import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { BANK_COUNTRIES, PAYMENT_ACCOUNTS, SYM } from '../../lib/constants';

export default function AddAccountModal() {
  const { addBankAccount } = useAppState();
  const { closeModal, toast } = useUi();

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [paymentAccount, setPaymentAccount] = useState('');
  const [address, setAddress] = useState('');

  const countryDef = BANK_COUNTRIES.find((c) => c.country === country);

  function setField(key, value) {
    setFieldValues((v) => ({ ...v, [key]: value }));
  }

  function handleCountryChange(val) {
    setCountry(val);
    setFieldValues({});
  }

  async function handleAdd() {
    const trimmedName = name.trim();
    if (!trimmedName) { toast('Account name is required.'); return; }
    if (!countryDef) { toast('Select a country/state.'); return; }
    try {
      const extraFields = {};
      countryDef.fields.forEach((f) => { extraFields[f.key] = (fieldValues[f.key] || '').trim(); });
      await addBankAccount({
        accountName: trimmedName,
        country: countryDef.country,
        currency: countryDef.currency,
        accountHolder: accountHolder.trim(),
        paymentAccount,
        address: address.trim(),
        ...extraFields
      });
      toast('Account added.');
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <>
      <button className="elg-modal-close" onClick={closeModal}><img src="/icons/model-close-icon.svg" alt="Close" width="20" height="20" /></button>
      <div className="elg-modal-hero">
        <div className="elg-modal-hero-icon"><img src="/images/addBankAccount.svg" alt="" /></div>
        <div className="elg-modal-title">Add Account</div>
        <div className="elg-modal-sub">
          {countryDef ? 'Add new bank account details and use it in invoice.' : 'Add name and select country/state.'}
        </div>
      </div>

      <div className="elg-modal-body addaccount">
        {!countryDef && (
          <>
            <div className="elg-field">
              <label>Account Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add Name" />
            </div>
            <div className="elg-field">
              <label>Country/State</label>
              <select className="elg-select" value={country} onChange={(e) => handleCountryChange(e.target.value)}>
                <option value="">Select</option>
                {BANK_COUNTRIES.map((c) => <option key={c.country} value={c.country}>{c.country}</option>)}
              </select>
            </div>
          </>
        )}

        {countryDef && (
          <>
            <div className="elg-field">
              <label>Country/State</label>
              <select className="elg-select" value={country} onChange={(e) => handleCountryChange(e.target.value)}>
                {BANK_COUNTRIES.map((c) => <option key={c.country} value={c.country}>{c.country}</option>)}
              </select>
            </div>
            <div className="elg-field-row">
              <div className="elg-field">
                <label>Account Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add Name" />
              </div>
              <div className="elg-field">
                <label>Currency</label>
                <input value={`${countryDef.currency} ${SYM[countryDef.currency] || ''}`} disabled />
              </div>
            </div>
            <div className="elg-field">
              <label>Account Holder</label>
              <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
            </div>
            {countryDef.fields.map((f) => (
              <div className="elg-field" key={f.key}>
                <label>{f.label}</label>
                {f.options ? (
                  <select className="elg-select" value={fieldValues[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)}>
                    <option value="">Select</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={fieldValues[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} />
                )}
              </div>
            ))}
            <div className="elg-field">
              <label>Payment Account</label>
              <select className="elg-select" value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)}>
                <option value="">Select</option>
                {PAYMENT_ACCOUNTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="elg-field">
              <input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="elg-modal-foot">
        <span className="spacer" />
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleAdd}>Add Account</button>
      </div>
    </>
  );
}
