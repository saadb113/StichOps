import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, ordersForEmployee, commissionAmt } from '../../lib/helpers';
import OrderFormModal from '../orders/OrderFormModal';
import { CloseIcon, PencilIcon } from '../icons/Icon';

export default function EditSlipOrdersModal({ ctx }) {
  const { orders, customers, payslips, getEmployee, getCustomer } = useAppState();
  const { closeModal, openModal } = useUi();

  let e; let rows; let showCustomer; let title; let bodyText;
  if (ctx.type === 'earnings') {
    e = getEmployee(ctx.employeeId);
    rows = ordersForEmployee(orders, customers, e).filter((o) => o.status === 'Completed' && o.customerId === ctx.customerId);
    showCustomer = false;
    const cust = getCustomer(ctx.customerId);
    title = `${cust ? cust.company : ''} — orders`;
    bodyText = 'Edit this order. Changes will be saved immediately and reflected in the employee\'s earnings and the Reports commission summary.';
  } else {
    const s = payslips.find((x) => x.id === ctx.slipId);
    e = getEmployee(s.employeeId);
    rows = orders.filter((o) => s.orderIds.includes(o.id));
    showCustomer = true;
    title = `Edit ${s.slipNo} — ${e.name}`;
    bodyText = 'Edit this order. Changes will be saved immediately and reflected in the Reports commission summary and this employee\'s Earnings tab. The slip total shown in history reflects the original approved amount.';
  }
  const isSales = e.role === 'Salesperson';

  return (
    <>
      <button className="elg-modal-close" style={{background : "none"}} onClick={closeModal}><img src="/icons/model-close-icon.svg" alt="Close" width="20" height="20" /></button>
      <div className="elg-modal-head-plain">
        <h3>{title}</h3>
      </div>
      <div className="elg-modal-body invoicesModal">
        <p style={{ fontSize: '16px', color: '#5C5C5C', marginBottom: 16, lineHeight: 1.5 }}>
          {bodyText}
        </p>
        <table className="elg-table">
          <thead><tr>
            <th>Order Name</th>
            {showCustomer && <th>Customer</th>}
            
            <th>{isSales ? 'Commission' : 'Production'}</th>
            
            <th>Action</th>
            </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={showCustomer ? 3 : 2} className="elg-empty">No linked orders.</td></tr>}
            {rows.map((o) => (
              <tr key={o.id}>
                {console.log(o)}
                <td>{o.name}</td>
                {showCustomer && <td>{getCustomer(o.customerId).company}</td>}
                <td>{fmt(isSales ? commissionAmt(o) : o.productionCost, isSales ? o.currency : (o.productionCostCurrency || o.currency))}</td>
                <td>
                  <button style={{marginLeft : "auto"}} className="elg-icon-sq" title="Edit order" onClick={() => openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' })}>
                    <img src="/icons/pencil-icon.svg" alt="" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="elg-modal-foot" >
        <span className="spacer" />
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={closeModal}>Done</button>
      </div>
    </>
  );
}
