import { useEffect, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { PlusIcon } from '../icons/Icon';

const AddOrderIcon = '/icons/add-icon-black.svg';
const AddCustomerIcon = '/icons/add-customer-icon.svg';
const AddEmployeeIcon = '/icons/employees-icon.svg';

// Admin gets a speed-dial FAB (expands to Add Order / Add Customer / Add
// Employee, button rolls into a black "×" with a transition); Salesperson
// only ever adds customers from here, so theirs stays the plain
// single-action FAB it always was.
export default function MobileFab({ onAddOrder, onAddCustomer, onAddEmployee }) {
  const { isAdmin } = useAppState();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDocClick(ev) { if (!ev.target.closest('.elg-fab-wrap')) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!isAdmin) {
    return (
      <button className="elg-fab" title="Add Customer" onClick={onAddCustomer}>
        <PlusIcon width={22} height={22} />
      </button>
    );
  }

  return (
    <div className="elg-fab-wrap">
      {open && (
        <div className="elg-fab-menu">
          <button className="elg-fab-menu-item" style={{ '--elg-fab-delay': '0.02s' }} onClick={() => { setOpen(false); onAddOrder(); }}>
            <img src={AddOrderIcon} alt="" width={18} height={18} /> Add Order
          </button>
          <button className="elg-fab-menu-item" style={{ '--elg-fab-delay': '0.08s' }} onClick={() => { setOpen(false); onAddCustomer(); }}>
            <img src={AddCustomerIcon} alt="" width={18} height={18} /> Add Customer
          </button>
          {onAddEmployee && (
            <button className="elg-fab-menu-item" style={{ '--elg-fab-delay': '0.14s' }} onClick={() => { setOpen(false); onAddEmployee(); }}>
              <img src={AddEmployeeIcon} alt="" width={18} height={18} /> Add Employee
            </button>
          )}
        </div>
      )}
      <button className={`elg-fab ${open ? 'open' : ''}`} title="Quick add" onClick={() => setOpen((v) => !v)}>
        <PlusIcon width={22} height={22} />
      </button>
    </div>
  );
}
