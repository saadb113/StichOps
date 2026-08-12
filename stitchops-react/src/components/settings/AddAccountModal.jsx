import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM } from '../../lib/constants';
import { CloseIcon } from '../icons/Icon';

export default function AddAccountModal() {
  const { addBankAccount } = useAppState();
  const { closeModal, toast } = useUi();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('');

  async function handleAdd() {
    const trimmedName = name.trim();
    if (!trimmedName) { toast('Account name is required.'); return; }
    if (!currency) { toast('Select a currency.'); return; }
    try {
      await addBankAccount({ accountName: trimmedName, currency, accountNo: '' });
      toast('Account added — fill in the account number from Edit.');
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <>
      <button className="elg-modal-close" onClick={closeModal}><CloseIcon /></button>
      <div className="elg-modal-hero">
        <div className="elg-modal-hero-icon"><img src="/images/addBankAccount.svg" alt="" /></div>
        <div className="elg-modal-title">Add Account</div>
        <div className="elg-modal-sub">Add new bank account details and use it in invoice.</div>
      </div>

      <div className="elg-modal-body">
        <div className="elg-field">
          <label>Account Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add Name" />
        </div>
        <div className="elg-field">
          <label>Currency</label>
          <select className="elg-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="">Select a currency</option>
            {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc} {SYM[cc]}</option>)}
          </select>
        </div>
      </div>

      <div className="elg-modal-foot">
        <span className="spacer" />
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleAdd}>Add Account</button>
      </div>
    </>
  );
}
